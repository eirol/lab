//
// TODO
// * careful with the dates!!!! (locale)
// * try TypeScript
// * [a...b) date intervals!
// * selection to analyze growth
// * adding and removing points
// * importing database from elsewhere?
//

let regression = methods;

let params = {
  startDate: parseDate('01/01/1950'),
  endDate: parseDate('01/01/2023'),
  xAxis: "Publication date",
  yAxis: "Parameters",
  separateCategories: false,
  citationThreshold: 0,
  otherDomainThreshold: 10,

  startDlEra: parseDate('01/01/2009'),
  startLargeScaleEra: parseDate('01/01/2018'),

  largeScaleAction: "ignore",
  outliersAction: "label",
  recordSettersAction: "label",
  bigAlphagoAction: "label",
  alphagozeroAction: "ignore",

  lowOutliersZValueThreshold: -2,
  highOutliersZValueThreshold: 0.82,
  outlierWindowSize: 2,

  filterText: "",

  splitDomains: [,], // ['Language', 'Vision', 'Games', 'Other', 'All']

  splitDlEra: true,
  splitLargeScaleEra: true,

  plotRegressions: false,
};

function preprocessDatabase(database) {
  for (let rowIndex = 0; rowIndex < database.rows.length; rowIndex++) {
    let row = database.rows[rowIndex];

    row["Row number"] = 2 + rowIndex;

    // Parsing
    row["Publication date"] = parseDate(row["Publication date"]);
    row["Publication date (julian date)"] = dateToJulianDate(row["Publication date"]);
    row["Training compute (FLOPs)"] = parseFloat(row["Training compute (FLOPs)"]);
    row["Parameters"] = parseFloat(row["Parameters"]);
    row["Citations"] = parseFloat(row["Citations"]);
    if (isNaN(row["Citations"])) row["Citations"] = 0;

    // Row augmentation
    row["Training compute per parameter (FLOPs)"] = row["Training compute (FLOPs)"] / row["Parameters"];
    row["Training compute times parameters"] = row["Training compute (FLOPs)"] * row["Parameters"];

    row["deleted"] = false;
  }
}

function generateGraph(database, params) {
  // TODO Check this
  let minDate = params.endDate;
  let maxDate = params.startDate;

  let rows = [];
  let domainCount = {};

  // Preprocessing
  for (let rowIndex = 0; rowIndex < database.rows.length; rowIndex++) {
    let row = database.rows[rowIndex];

    row.deleted = true;

    row["_Domain"] = row["Domain"];

    if (!params.separateCategories) {
      row["_Domain"] = "All";
    }

    if (row["System"] == "AlphaGo Zero" && params.alphagozeroAction == "label") {
      row["_Domain"] = 'AlphaGo Zero';
    }

    //
    // Filtering
    //

    // By date
    if (!(params.startDate <= row["Publication date"] && row["Publication date"] < params.endDate)) {
      continue;
    }

    // By number of citations
    if (row["Citations"] < params.citationThreshold) {
      continue;
    }

    // By zeroes/NaNs
    if (isNaN(row[params.xAxis]) || isNaN(row[params.yAxis]) || row[params.yAxis] == 0 || (params.xAxis != "Publication date" && row[params.xAxis] == 0)) {
      continue;
    }

    if (row["System"] == "AlphaGo Zero" && params.alphagozeroAction == "remove") {
      continue;
    }

    row.deleted = false;

    //
    // Misc
    //
    if (row["Publication date"] < minDate) minDate = row["Publication date"];
    if (row["Publication date"] > maxDate) maxDate = row["Publication date"];

    let domain = row["_Domain"];
    if (!(domain in domainCount)) domainCount[domain] = 0;
    domainCount[domain]++;

    row._x = row[params.xAxis];
    row._y = row[params.yAxis];

    rows.push(row);
  }

  // Recode low count domains as "other"
  for (let row of rows) {
    if (domainCount[row["_Domain"]] < params.otherDomainThreshold) {
      row["_Domain"] = "Other";
    }
  }

  //
  // Eras
  //

  // Define eras
  eras = [
    {Era: 'Pre Deep Learning Era', start: params.startDate,          stop: params.startDlEra},
    {Era:     'Deep Learning Era', start: params.startDlEra,         stop: params.startLargeScaleEra},
    {Era:       'Large Scale Era', start: params.startLargeScaleEra, stop: params.endDate},
  ]

  // Modify eras start-stop to fit the considered timespan and remove the ones outside of it
  for (let eraIndex = eras.length - 1; eraIndex >= 0; eraIndex--) {
    let era = eras[eraIndex];

    if (era.start >= params.endDate || era.stop <= params.startDate) {
      eras.splice(eraIndex, 1);
      continue;
    }

    // TODO Is this right when there are few articles? You might have made a mistake translating the code.
    if (era.stop > params.endDate)    era.stop = params.endDate;
    if (era.start < params.startDate) era.start = params.startDate;
  }

  rows = filterOutliers(rows, params);
  rows = filterRecords(rows, params);

  // Separate domains per era
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    let row = rows[rowIndex];

    if (!(params.splitDomains.includes(row["_Domain"]))) {
      continue;
    }

    for (let era of eras) {
      if ((era.start <= row["Publication date"]) && (row["Publication date"] <= era.stop)) {
        row["_Domain"] += " " + era.Era;
        break;
      }
    }
  }

  addEraInfo(rows, eras, params);

  let regressionData = regressData(rows, eras, params);

  return {articles: rows, eras: eras, regressionData: regressionData};
}

// TODO Regress on each domain

function filterOutliers(rows, params) {
  rows.sort(function(a,b) {
    return a["Publication date"] - b["Publication date"];
  });

  let outlierRows = [];
  let largeScaleRows = [];

  for (let axis of [params.xAxis, params.yAxis]) {
    if (axis == 'Publication date') continue;

    let loopCount = 0;

    let startFinger = 0
    let endFinger = 0

    let rollingSum = 0
    let rollingSquareSum = 0
    let rollingCount = 0

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      let row = rows[rowIndex];
      if (row.deleted) continue;

      // Filter entries in a 3-year window around the paper
      let windowSize = params.outlierWindowSize * 52*7*86400e3;

      let window = [
        new Date(row["Publication date"].getTime() - windowSize/2),
        new Date(row["Publication date"].getTime() + windowSize/2),
      ];

      while (startFinger < rows.length && rows[startFinger]["Publication date"] < window[0]) {
        let v = Math.log10(rows[startFinger][axis]);
        rollingSum -= v;
        rollingSquareSum -= v*v;
        rollingCount--;
        startFinger++;
      }

      while (endFinger < rows.length && rows[endFinger]["Publication date"] < window[1]) {
        let v = Math.log10(rows[endFinger][axis]);
        rollingSum += v;
        rollingSquareSum += v*v;
        rollingCount++;
        endFinger++;
      }

      if (rollingCount < 2) continue

      let v = Math.log10(row[axis]);

      let mean = rollingSum/rollingCount;
      let variance = (rollingSquareSum/rollingCount) - mean**2;
      let std = Math.sqrt(variance);

      let zScore = (v - mean)/std;

      if (zScore < params.lowOutliersZValueThreshold) {
        outlierRows.push(row);
      }

      if (zScore > params.highOutliersZValueThreshold && row['Publication date'] > params.startLargeScaleEra) {
        largeScaleRows.push(row);
      }
    }
  }

  for (let row of outlierRows) {
    if (params.outliersAction == 'remove') {
      row.deleted = true;
    } else if (params.outliersAction == 'label') {
      row._Domain = 'Outlier';
    }
  }

  for (let row of largeScaleRows) {
    if (params.largeScaleAction == 'label') {
      row["_Domain"] = "Large Scale";
    } else if (params.largeScaleAction == 'isolate') {
      row["_Domain"] = "Large Scale"; // ????? TODO
    }
  }

  // Drop AlphaGo Zero
  if (params.bigAlphagoAction == 'remove') {
    for (let row of largeScaleRows) {
      if ("System" == "AlphaGo Zero" || "System" == "AlphaGo Master") {
        row.deleted = true;
      }
    }
  } else if (params.bigAlphagoAction == 'label') {
    for (let row of largeScaleRows) {
      if ("System" == "AlphaGo Zero" || "System" == "AlphaGo Master") {
        row._Domain = "AlphaGo Zero";
      }
    }
  }

  return rows;
}

function filterRecords(rows, params) {
  let allRecords = [];
  let recordRowsPerDomain = {};

  // TODO Record setters
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    let row = rows[rowIndex];
    if (row.deleted) continue;

    let records = recordRowsPerDomain[row["_Domain"]];
    if (records == undefined) {
      records = [];
      recordRowsPerDomain[row["_Domain"]] = records;
    }

    if (records.length == 0 || row[params.yAxis] > records[records.length-1][params.yAxis]) {
      records.push(row);
      allRecords.push(row);
    }
  }

  if (params.recordSettersAction == 'isolate') {
    rows = allRecords;
  } else if (params.recordSettersAction == 'label') {
    for (let row of allRecords) row._Domain = "Record";
  }

  return rows;
}

function addEraInfo(rows, eras, params) {
  if (eras.length == 0) return;

  // Add era labels to each domain
  let currentEraIndex = 0;
  let era = "Machine Learning Era";
  for (let row of rows) {
    if (row.deleted) continue;

    while (currentEraIndex < eras.length && !(eras[currentEraIndex].start <= row["Publication date"] && row["Publication date"] <= eras[currentEraIndex].stop)) {
      currentEraIndex++;
    }

    if (currentEraIndex == eras.length) break;

    if (params.splitDlEra) {
      era = eras[currentEraIndex].Era;
    }

    if (era == "Large Scale Era" && !params.splitLargeScaleEra) {
      era = 'Deep Learning Era';
    }

    row.Era = era;
    row._Era = eras[currentEraIndex];
  }
}

function extractEraDomains(rows) {
  let added = new Set();
  let eraDomains = [];
  let currentGroup = [];

  let eraDomainToGroup = {};

  for (let row of rows) {
    if (row.deleted) continue;

    let key = row.Era + ";" + row._Domain;
    if (!added.has(key)) {
      added.add(key);
      group = [];
      eraDomains.push([row.Era, row._Domain, group]);
      eraDomainToGroup[key] = group;
    }

    eraDomainToGroup[key].push(row);
  }

  eraDomains.sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return +1;

    // a[0] == b[0]
    if (a[1] < b[1]) return -1;
    if (a[1] > b[1]) return +1;

    // a == b
    return 0;
  })

  return eraDomains;
}

function regressData(rows, eras, params) {
  let regressionData = [];

  for (let [era, domain, group] of extractEraDomains(rows)) {
    let data = [];

    let minEra;
    let maxEra;
    let minX = Infinity;
    let maxX = -Infinity;

    for (let row of group) {
      let x = (params.xAxis == "Publication date") ? dateToJulianDate(row["Publication date"]) : Math.log10(row[params.xAxis]);
      let y = Math.log10(row[params.yAxis]);

      if (x < minX) {minX = x; minEra = row._Era};
      if (x > maxX) {maxX = x; maxEra = row._Era};

      data.push([x, y]);
    }

    if (data.length < 2) continue;

    let model = regression.linear(data, { order: 2, precision: null });
    let bestSlope = model.coeffs[0];

    let xPred; 
    if (params.xAxis == 'Publication date') {
      // Stretch datapoints to cover the corresponding era
      xPred = [dateToJulianDate(minEra.start), dateToJulianDate(maxEra.stop) - 0.0001];
    } else {
      xPred = [minX, maxX];
    }

    let yPred = [model.predict(xPred[0])[1], model.predict(xPred[1])[1]];

    // Postprocessing

    if (params.xAxis == 'Publication date') {
      xPred[0] = julianDateToDate(xPred[0]);
      xPred[1] = julianDateToDate(xPred[1]);
    } else {
      xPred[0] = 10.0**xPred[0];
      xPred[1] = 10.0**xPred[1];
    }

    yPred[0] = 10.0**yPred[0];
    yPred[1] = 10.0**yPred[1];

    for (let i = 0; i < 2; i++) {
      regressionData.push({
        [params.xAxis]: xPred[i],
        [params.yAxis]: yPred[i],
        Domain: domain,
        visible: true,
      });
    }
  }

  regressionData.sort((a, b) => a[params.xAxis] - b[params.xAxis]);

  return regressionData;
}

///////////////////////////////////////////////////////////////////////////////
// Utility library
//////////////////////////////////////////////////////////////////////////////

// TODO Fix this
function parseDate(str) {
  let fields = str.split("/");

  let day = 1;
  let month = 1;
  let year;

  if (fields.length == 1) {
    year = fields[0];
  } else {
    day   = fields[0];
    month = fields[1];
    year  = fields[2];
  }

  return new Date(year, month - 1, day, 1, 0, 0, 0);
}

function print(obj) {
  console.log(obj);
}

function shallowCopy(obj) {
  return {...obj};
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function dateToJulianDate(date) {
  var x = Math.floor((14 - date.getMonth())/12);
  var y = date.getFullYear() + 4800 - x;
  var z = date.getMonth() - 3 + 12 * x;

  var n = date.getDate() + Math.floor(((153 * z) + 2)/5) + (365 * y) + Math.floor(y/4) + Math.floor(y/400) - Math.floor(y/100) - 32045;

  return n;
}   

function julianDateToDate(julianDate) {
  // https://stackoverflow.com/a/26371251

  let epoch = 2440587.5; // 1970-01-01 00:00 (one would hope)
  let millis = (julianDate - 2440587.5) * 86400000;
  let date = new Date(millis);

  return date;
}

///////////////////////////////////////////////////////////////////////////////
// Testing
//////////////////////////////////////////////////////////////////////////////

/*
preprocessDatabase(database);

let t0 = Date.now();

let iterationCount = 1;
let rows = generateGraph(database, params);

let t1 = Date.now();
//print((t1 - t0)/iterationCount);
*/
