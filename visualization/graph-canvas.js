



let domainStyles = {
  'Vision':       ['#6d904f', 'cross'],
  'Language':     ['#b96db8', 'square'],
  'Games':        ['#30a2da', 'circle'],
  'Drawing':      ['#8b8b8b', 'M0,.5L.6,.8L.5,.1L1,-.3L.3,-.4L0,-1L-.3,-.4L-1,-.3L-.5,.1L-.6,.8L0,.5Z'],
  'Speech':       ['#ff9e27', 'triangle-down'],
  'Other':        ['#e5ae38', 'diamond'],
  'Large Scale':  ['#fc4f30', 'triangle'],
  'All':          ['#30a2da', 'circle'],
  'Outlier':      ['#56cc60', 'triangle-left'],
  'Record':       ['#bfc11b', 'triangle-up'],
  'AlphaGo Zero': ['#ff9e27', 'M0,.5L.6,.8L.5,.1L1,-.3L.3,-.4L0,-1L-.3,-.4L-1,-.3L-.5,.1L-.6,.8L0,.5Z'],
};

function _preprocessDatabase(database) {
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

  function dateToJulianDate(date) {
    var x = Math.floor((14 - date.getMonth())/12);
    var y = date.getFullYear() + 4800 - x;
    var z = date.getMonth() - 3 + 12 * x;

    var n = date.getDate() + Math.floor(((153 * z) + 2)/5) + (365 * y) + Math.floor(y/4) + Math.floor(y/400) - Math.floor(y/100) - 32045;

    return n;
  }   

  for (let rowIndex = 0; rowIndex < database.rows.length; rowIndex++) {
    let row = database.rows[rowIndex];

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

    row["visible"] = true;
  }
}

let _database = JSON.parse(JSON.stringify(database));
_preprocessDatabase(_database);

let view;
let prevXAxis = "";
let prevYAxis = "";

function buildVega(data, eras) {
  //let xAxis = "Publication date";
  //let yAxis = "Parameters";
  let xAxis = d3.selectAll("#xAxis").node().value;
  let yAxis = d3.selectAll("#yAxis").node().value;

  let vegaSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",

    //"data": {"url": "https://raw.githubusercontent.com/vega/vega/master/docs/data/cars.json"},
    //"data": {values: vegaData},

    legend: {
      padding: 10000,
    },

    width: "container",
    //height: "500",
    height: "container",

      /*
    signals: [
      {
        name: "yAxis",
        value: "Parameters",
      },
    ],
    */

    datasets: {
      "data-eras": eras,
      "data": data,
      "regression": [
        {x: 0, y: 0.1},
        {x: 2020, y: 1e10},
      ],
    },

    "resolve": {"scale": {"color": "independent", "shape": "independent"}},

    layer: [
      {
        "data": {"name": "data"},
        "mark": {"type": "point", "filled": false, "size": 120, cursor: "pointer"},

        "transform": [
          {"filter": "datum.visible"}
        ],

        "params": [{
          "name": "grid",
          "select": "interval",
          "bind": "scales"
        }],

        "encoding": {
          "x": {
            "axis": {
              "title": null,
            },
            //"field": "Publication date",
            "field": xAxis,
            /*
            "scale": {
              "domain": ["1952-01-01T00:00:00", "2021-12-20T00:00:00"],
              "type": "time",
            },
            */
            "scale": {"type": xAxis == "Publication date" ? "time" : "log"},
            "type": xAxis == "Publication date" ? "temporal" : "quantitative"
          },

          "y": {
            "axis": {
              "format": ".1e",
              "grid": true,
              "title": null,
            },
            //"field": "Parameters",
            "field": yAxis,
            "scale": {"domain": [16, 12000000000000], "type": "log"},
            "type": "quantitative"
          },

          "color": {
            "field": "_Domain",
            "type": "nominal",
            "legend": null,
              /*
            "scale": {
              "domain": ["Games", "Drawing", "Language", "Other", "Record", "Speech", "Vision"],
              "range": ["#fc4f30", "#30a2da", "#56cc60",  "#fc4f30", "#30a2da", "#56cc60", "#fc4f30", "#30a2da", "#56cc60",]
            },
            */
          },

          "shape": {
            "field": "_Domain",
            "type": "nominal",
            "legend": null,
            //"scale": {
            //  "domain": ["Large Scale", "All", "Outlier"],
            //  "range": ["triangle", "circle", "triangle-left"]
            //},
              /*
            "scale": {
              "domain": ["Games", "Drawing", "Language", "Other", "Record", "Speech", "Vision"],
              "range": ["triangle", "circle", "triangle-left", "triangle", "circle", "triangle-left", "triangle", "circle", "triangle-left"]
            },
              */
          },

          "tooltip": [
            {"field": "System", "type": "nominal"},
            {"field": "Reference", "type": "nominal"},
            {"field": "Publication date", "type": "temporal"},
            {"field": "Parameters", "format": ".1e", "type": "quantitative"},
            {
              "field": "Training compute (FLOPs)",
              "format": ".1e",
              "type": "quantitative"
            },
            {
              "field": "Inference compute (FLOPs)",
              "format": ".1e",
              "type": "quantitative"
            },
            {"field": "_Domain", "type": "nominal"}
          ],
        },
      },
      /*
      {
        "data": {
          "name": "regression",
        },
        "mark": {
          "type":"line",
          "color":"purple"
        },
        "encoding": {
          "x":{
            "field":"x",
            "type":"quantitative"
          },
          "y":{
            "field":"y",
            "type":"quantitative"
          }
        }
      }
      */
    ],
  };

  let domains = [];
  let colorRange = [];
  let shapeRange = [];
  for (let domain in domainStyles) {
    domains.push(domain);
    colorRange.push(domainStyles[domain][0]);
    shapeRange.push(domainStyles[domain][1]);
  }

  vegaSpec.layer[0].encoding.color.scale = {
    domain: domains,
    range: colorRange,
  };

  vegaSpec.layer[0].encoding.shape.scale = {
    domain: domains,
    range: shapeRange,
  };

  if (xAxis == "Publication date") {
    vegaSpec.layer.push({
      "data": {"name": "data-eras"},
      "mark": {"type": "rect", "opacity": 0.1},
      "encoding": {
        "color": {
          "field": "Era",
          "legend": null,
          "scale": {
            "domain": [
              "Pre Deep Learning Era",
              "Deep Learning Era",
              "Large Scale Era"
            ],
            "range": ["#e5ae38", "#30a2da", "#fc4f30"]
          },
          "type": "nominal"
        },
        "x": {
          "field": "start",
          "title": "Publication date",
          "type": "temporal"
        },
        "x2": {"field": "stop"},
        "y": {"value": 0},
        "y2": {"value": 1000}
      }
    });

    vegaSpec.layer.push({
      "data": {"name": "data-eras"},
      "mark": {
        "type": "text",
        "align": "right",
        "angle": 270,
        "baseline": "top",
        "dx": -20,
        "dy": 20,
        "fontWeight": "bold",
        "size": 14
      },
      "encoding": {
        "color": {
          "field": "Era",
          "legend": null,
          //"scale": {
          //  "domain": [
          //    "Pre Deep Learning Era",
          //    "Deep Learning Era",
          //    "Large Scale Era"
          //  ],
          //  "range": ["#e5ae38", "#30a2da", "#fc4f30"]
          //},
          "type": "nominal"
        },
        "text": {"field": "Era", "type": "nominal"},
        "x": {
          "field": "start",
          "title": "Publication date",
          "type": "temporal"
        },
        "y": {"value": 0}
      }
    });
  }

  vegaEmbed('#vega', vegaSpec, {"actions": false}).then(function(result) {
    // Access the Vega view instance (https://vega.github.io/vega/docs/api/view/) as result.view
    //view.remove('table', function(d) { return d.count < 5; }).run();
    //changeAxis(result.view, "x", "data");
    /*
    for (let row of vegaSpec.data.values) {
      row.Parameters = 12e12;
    }
    */

    view = result.view;

    //view.renderer('svg');

    view.addEventListener('mouseover', function(event, item) {
    });

    view.addEventListener('click', function(event, item) {
      if (item.datum && item.datum.Link) {
        window.open(item.datum.Link, "width=500,height=500,top=100,left=500");
        //let rowNumber = item.datum["Row number"];
        //console.log(rowNumber);
        //window.open("https://docs.google.com/spreadsheets/d/1AAIebjNsnJj_uKALHbXNfn3_YsT6sHXtCU0q7OIPuc4/edit#gid=0&range=A" + rowNumber + ":J" + rowNumber, "width=500,height=500,top=100,left=500");
      }
      //console.log(item.datum);
    });

    //let foobar = JSON.parse(JSON.stringify(_database));
    /*
    let foobar = _database;
    let a = 0;
    for (let row of foobar.rows) {
      row.visible = (a++ < 20);
    }

    // Oh, my goodness

    var changeSet = vega.changeset().remove(() => true);
    result.view.change('data', changeSet).run();
    var changeSet = vega.changeset().insert(foobar.rows);
    result.view.change('data', changeSet).runAsync();
    */

    /*
    for (let row of foobar.rows) {
      row.visible = (a++ < 5);
    }
    var changeSet = vega.changeset().remove(() => true).insert(foobar.rows);
    result.view.change('data', changeSet).runAsync();
    */

    /*
    var changeSet = vega.changeset()
      .insert(valueGenerator())
      .remove(function (t) {
        return t.x < minimumX;
      });
    */
  }).catch(console.error);
}

function changeAxis(view, axis, newAxisName) {
  document.getElementsByClassName("role-axis-title")[(axis == 'x') ? 0 : 1].children[0].innerHTML = newAxisName;
}

let viewport = {
  x: 2000,
  y: 1,
  width: 17, 
  height: 12, 
};

let objects = [];

let selectedObject = null;

function onMouseMove(e) {
  let x = e.clientX - this.offsetLeft;
  let y = e.clientY - this.offsetTop;

  tooltip.classList.add("hidden");
  //tooltip.style.left = e.clientX + 10 - 150;
  //tooltip.style.top = e.clientY + 10;
  tooltip.style.left = x + 10;
  tooltip.style.top = y + 10;

  newSelectedObject = null;

  for (let object of objects) {
    if (distance({x: x, y: y}, object) < 10) {
      tooltip.classList.remove("hidden");
      tooltip.innerText = object.description;
      newSelectedObject = object;
      break;
    }
  }

  if (selectedObject != newSelectedObject) {
    selectedObject = newSelectedObject;
    redraw();
  }
}

function onClick(e) {
  if (selectedObject) {
    //console.log(selectedObject.link);
    window.open(selectedObject.link, "width=500,height=500,top=100,left=500")
  }
}

function updateData(data, eras, labelEras, extractX, extractY, extractLabel) {
  objects = [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < data.length; i++) {
    let row = data[i];
    let x = extractX(row);
    let y = extractY(row);

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  for (let i = 0; i < data.length; i++) {
    let row = data[i];
    objects.push({
      x: (extractX(row) - minX)/(maxX - minX) * (window.innerWidth - 100) + 50,
      y: window.innerHeight - (extractY(row) - minY)/(maxY - minY) * (window.innerHeight - 80) - 60,
      description: extractLabel(row),
      _Domain: row._Domain,
      link: row.Link, // TODO
    });
  }

  let xAxis = d3.selectAll("#xAxis").node().value;
  let yAxis = d3.selectAll("#yAxis").node().value;

  if (xAxis != prevXAxis || yAxis != prevYAxis) {
    buildVega(data, eras);
    prevXAxis = xAxis;
    prevYAxis = yAxis;
  } else if (view) {
    var changeSet = vega.changeset().remove(() => true);
    view.change('data', changeSet).run();
    var changeSet = vega.changeset().insert(data);
    view.change('data', changeSet).runAsync();

    var changeSet = vega.changeset().remove(() => true);
    view.change('data-eras', changeSet).run();
    if (labelEras) {
      var changeSet = vega.changeset().insert(eras);
      view.change('data-eras', changeSet).runAsync();
    }

    // Rebuild the legend
    let domains = new Set();
    for (let row of data) {
      if (row.visible) domains.add(row._Domain);
    }

    let legend = d3.selectAll(".side-box").selectAll(".legend").node();
    legend.innerHTML = "";

    let domainEnabled = {
    };

    for (let domain in domainStyles) {
      if (!domains.has(domain)) continue;
      domainEnabled[domain] = true;

      let div = document.createElement("div");
      div.innerHTML = domain;
      div.style.color = domainStyles[domain][0];
      div.addEventListener("click", () => {
        div.classList.toggle("disabled");
        domainEnabled[domain] = !div.classList.contains("disabled");

        // TODO WRONG!!!
        for (let row of data) {
          row.visible = domainEnabled[row._Domain];
        }

        var changeSet = vega.changeset().remove(() => true);
        view.change('data', changeSet).run();
        var changeSet = vega.changeset().insert(data);
        view.change('data', changeSet).runAsync();
      });
      legend.appendChild(div);
    }
  }

  //buildChart(d3.selectAll("#xAxis").node().value, d3.selectAll("#yAxis").node().value);

  redraw();
}

function redraw() {
  ctx.save();

  ctx.beginPath();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.fillStyle = '#fcf7eb';
  ctx.fillRect(55, 0, canvas.width - 55, canvas.height - 50);

  drawGrid();
  drawAxes();

  ctx.beginPath();
  ctx.rect(55, 0, canvas.width - 55, canvas.height - 50);
  ctx.clip();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#cdc8bc';
  ctx.stroke();

  for (let object of objects) {
    ctx.lineWidth = 2;

    if (object == selectedObject) {
      ctx.lineWidth = 4;

      /*
      ctx.fillStyle = '#333333';
      drawCircle(ctx, object.x, object.y, 6);
      */
    }

    //ctx.fillStyle = '#bd74ab';
    ctx.strokeStyle = '#e5ae38';

    if (object._Domain == 'Language') ctx.strokeStyle = '#000000';
    if (object._Domain == 'Vision')   ctx.strokeStyle = '#00ff00';
    if (object._Domain == 'Games')    ctx.strokeStyle = '#0000ff';
    if (object._Domain == 'Other')    ctx.strokeStyle = '#ffff00';
    if (object._Domain == 'All')      ctx.strokeStyle = '#ff00ff';

    drawDiamond(ctx, object.x, object.y, 5);
  }

  ctx.restore();
}

function drawGrid() {
  ctx.strokeStyle = '#cdc8bc';
  ctx.lineWidth = 1;

  let x0 = 40;
  let y0 = 40;

  // Vertical
  for (var i = 0; i < 50; i++) {
    let x = i*65;
    drawLine(x, 0, x, canvas.height - y0);
  }

  // Horizontal
  for (var i = 0; i < 13; i++) {
    let y = i*50;
    drawLine(x0, y, canvas.width, y);
  }
}

function drawAxes() {
  ctx.strokeStyle = '#cdc8bc';
  ctx.fillStyle = '#9d988c';
  ctx.font = '23px serif';
  ctx.lineWidth = 1;

  let x0 = 40;
  let y0 = 40;


  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Vertical
  for (var i = 1; i < 50; i++) {
    let x = i*65;
    ctx.fillText(2000 + i, x, canvas.height - y0 + 17);
  }

  // Horizontal
  for (var i = 1; i < 13; i++) {
    let y = i*50;
    ctx.fillText(i, x0 - 17, y);
  }
}

function drawCircle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.ellipse(x, y, r, r, 0, 0, 2*Math.PI);
  ctx.fill();
}

function drawLine(x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawDiamond(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx + r, cy + 0);
  ctx.lineTo(cx + 0, cy - r);
  ctx.lineTo(cx - r, cy - 0);
  ctx.lineTo(cx - 0, cy + r);
  ctx.closePath();
  ctx.stroke();
}

function distance(p, q) {
  return Math.sqrt((q.x - p.x)**2 + (q.y - p.y)**2);
}

let data = [];
for (let i = 0; i < 100; i++) {
  data.push({
    //x: i*window.innerWidth/100,
    //y: 350 - 300 * Math.sin(2*Math.PI * i*window.innerHeight/1),
    x: i,
    y: i,
    description: "Diamond " + i
  });
}

//updateData(data, 'x', 'y', 'description');


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// D3
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// set the dimensions and margins of the graph
var margin = {top: 10, right: 30, bottom: 30, left: 60},
    width = 460*2 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

let xAxis = "Year";
let yAxis = "Citations";

let svg;

function buildChart(xAxis, yAxis) {
  let d3Data = [];
  for (let row of _database.rows) {
    if (isNaN(row[xAxis]) || isNaN(row[yAxis]) || row[yAxis] == 0) {
      continue;
    }

    d3Data.push(row);
  }

  d3.selectAll("#my_dataviz > *").remove();

  // append the svg object to the body of the page
  svg = d3.select("#my_dataviz")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

  let grLivAreaDomain = [0, 2025];
  let salePriceDomain = [0, 500000];

  let symbol = d3.symbol();

  var x = (xAxis == "Publication date") ? d3.scaleTime() : d3.scaleLog();
  x = x.domain(d3.extent(d3Data, function (d) { return d[xAxis]}))
   .range([ 0, width ]);

  var y = d3.scaleLog()
    .domain(d3.extent(d3Data, function (d) { return d[yAxis]}))
    .range([ height, 0]);

  // Add X axis
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Add Y axis
  svg.append("g")
    .call(d3.axisLeft(y));

  // Add dots
  svg.append('g')
    .selectAll("dot")
    .data(d3Data)
    .enter()
    .append("path")
      //.attr("cx", function (d) { return x(d[xAxis]); })
      //.attr("cy", function (d) { return y(d[yAxis]); })
      //.attr("r", 1.5)
      .attr("d", function (d) {
        let symbol = d3.symbolCircle;

        if (d.Domain == "Games")    symbol = d3.symbolCross;
        if (d.Domain == "Drawing")  symbol = d3.symbolDiamond;
        if (d.Domain == "Language") symbol = d3.symbolSquare;
        if (d.Domain == "Other")    symbol = d3.symbolStar;
        if (d.Domain == "Speech")   symbol = d3.symbolTriangle;
        if (d.Domain == "Vision")   symbol = d3.symbolWye;

        return d3.symbol().type(symbol)();
      })
      .attr("transform", function(d) { return "translate(" + x(d[xAxis]) + "," + y(d[yAxis]) + ")"; })
      .attr("class", "dataPoint")
      .style("fill", "none")
      .style("stroke", function (d) {
        let color = "#69b3a2";

        if (d.Domain == "Games")    color = "red";
        if (d.Domain == "Drawing")  color = "green";
        if (d.Domain == "Language") color = "blue";
        if (d.Domain == "Other")    color = "purple";
        if (d.Domain == "Speech")   color = "orange";
        if (d.Domain == "Vision")   color = "pink";

        return color;
      })
      .style("stroke-width", "2")
      .append("path")
}

function updateGraph() {
  let startYear =  parseInt(d3.select("#startYear").node().value);
  let endYear   =  parseInt(d3.select("#endYear").node().value);

  svg.selectAll(".dataPoint").each(function (datum, index, node) {
    d3.select(this).style("visibility", ((startYear <= parseInt(datum.GrLivArea)) && (parseInt(datum.GrLivArea) < endYear)) ? "visible" : "hidden");
  });
}
