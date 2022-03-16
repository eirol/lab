
// Take a look at CodePen's style: https://css-tricks.com/creating-star-heart-animation-svg-vanilla-javascript/


/////////////////////////////////////////////////////
// The main stuff
/////////////////////////////////////////////////////

let p = console.log;

function _(parent, selector) {
  return parent.querySelector(selector);
}

function html(str) {
  let tmpDiv = document.createElement("div");
  tmpDiv.innerHTML = str;
  return tmpDiv.firstElementChild;
}

function makeId() {
  return '_xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let domainsDisabled = {
    'Vision'       : false,
    'Language'     : false,
    'Games'        : false,
    'Drawing'      : false,
    'Speech'       : false,
    'Other'        : false,
    'Large Scale'  : false,
    'All'          : false,
    'Outlier'      : false,
    'Record'       : false,
    'AlphaGo Zero' : false,
};

function renderVega(id, data, eras, regressionData, xAxis, yAxis, plotRegressions, labelPoints, onRender) {
  let container = _(document, "#" + id);

  for (let data of regressionData) {
    data.visible = plotRegressions;
  }

  let domains = [];
  let colorRange = [];
  let shapeRange = [];
  for (let domain in domainStyles) {
    domains.push(domain);
    colorRange.push(domainStyles[domain][0]);
    shapeRange.push(domainStyles[domain][1]);
  }

  let vegaSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",

    width: "container",
    height: "container",

    datasets: {
      "data-eras": eras,
      "data": data,
      "regression-lines": regressionData,
    },

    params: [
      {name: "labelSystems", value: labelPoints},
      {name: "domainsDisabled", value: domainsDisabled},
    ],

    "resolve": {
      "scale": {
        "color": "independent",
        "shape": "independent",
      },
    },

    layer: [
      {
        "data": {"name": "data"},
        //"mark": {"type": "point", "filled": false, "size": 120, cursor: "pointer"},
        "mark": {"type": "point", "filled": false, "size": 120},

        "transform": [
          {"filter": {"and": [{"not": "datum.delete"}, "datum.visible", {"not": "domainsDisabled[datum._Domain]"}]}}
        ],

        "params": [{
          "name": "grid",
          "select": "interval",
          "bind": "scales"
        }],

        "encoding": {
          "x": {
            "axis": {
              //"title": null,
            },
            "field": xAxis,
            "scale": {
              "type": (xAxis == "Publication date") ? "time" : "log",
            },
            "type": (xAxis == "Publication date") ? "temporal" : "quantitative"
          },

          "y": {
            "axis": {
              "format": ".1e",
              "grid": true,
              //"title": null,
            },
            "field": yAxis,
            //"scale": {"domain": [16, 12000000000000], "type": "log"},
            "scale": {"type": "log"},
            "type": "quantitative"
          },

          "color": {
            "field": "_Domain",
            "type": "nominal",
            "legend": null,
          },

          "shape": {
            "field": "_Domain",
            "type": "nominal",
            "legend": null,
          },

          "tooltip": [
            {"field": "System", "type": "nominal"},
            {"field": "Organization(s)", "type": "nominal"},
            {"field": "Author(s)", "type": "nominal"},
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
      {
        "data": {
            "name": "regression-lines"
        },

        "transform": [
          {"filter": "datum.visible"},
          {"filter": {"and": ["datum.visible", {"not": "domainsDisabled[datum.Domain]"}]}},
        ],

        "encoding": {
            "color": {
                "field": "Domain",
                "legend": null,
                "scale": {
                    "domain": [
                        'Vision', 'Language', 'Games', 'Drawing', 'Speech', 'Other', 'Large Scale',  'All', 'Outlier', 'Record', 'AlphaGo Zero', 
                    ],
                    "range": [
                        '#6d904f', '#b96db8', '#30a2da', '#8b8b8b', '#ff9e27', '#e5ae38', '#fc4f30', '#30a2da', '#56cc60', '#bfc11b', '#ff9e27',
                    ]
                },
                "type": "nominal"
            },
            "x": {
              "field": "Publication date",
              "type": "temporal"
            },
            "y": {
                "field": "Parameters",
                "type": "quantitative"
            }
        },
        "mark": {
            "clip": true,
            "point": false,
            "strokeDash": [
                10,
                5
            ],
            "type": "line"
        }
      }
    ],
  };

  let xAxisType = (xAxis == "Publication date") ? "temporal" : "quantitative";

  vegaSpec.layer[1].encoding.x = {
    field: xAxis,
    type: xAxisType,
  }

  vegaSpec.layer[1].encoding.y = {
    field: yAxis,
    type: "quantitative",
  };

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < data.length; i++) {
    let row = data[i];

    if (row.deleted || !row.visible) continue;

    let x = row[xAxis];
    let y = row[yAxis];

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    row._x = x;
    row._y = y;
  }

  if (minX instanceof Date) {
    let minTime = minX.getTime();
    let maxTime = maxX.getTime();
    let margin = Math.max(86400e3, 0.01 * (maxTime - minTime));

    minX = new Date(minTime - margin);
    maxX = new Date(maxTime + margin);
  };

  vegaSpec.layer[0].encoding.x.scale.domain = (minX instanceof Date) ?  [minX.toISOString(), maxX.toISOString()] : [minX/10, maxX*10];
  vegaSpec.layer[0].encoding.y.scale.domain = [minY/10, maxY*10];

  vegaSpec.layer[0].encoding.color.scale = {
    domain: domains,
    range: colorRange,
  };

  vegaSpec.layer[0].encoding.shape.scale = {
    domain: domains,
    range: shapeRange,
  };

  if (true && xAxis == "Publication date") {
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

  if (xAxis == "Publication date") {
    let mid = 0.5*(dateToJulianDate(minX) + dateToJulianDate(maxX));
    for (let row of data) {
      if (row.deleted || !row.visible) continue;
      row._alignment = (dateToJulianDate(row._x) < mid) ? "left" : "right";
    }
  } else {
    let mid = 0.5*(Math.log10(minX) + Math.log10(maxX));
    for (let row of data) {
      if (row.deleted || !row.visible) continue;
      row._alignment = (Math.log10(row._x) < mid) ? "left" : "right";
    }
  }

  // Labels
  vegaSpec.layer.push({
      "data": {"name": "data"},

      "mark": {"type": "text", "align": {expr: "datum._alignment"}, "baseline": "middle", "dx": {expr: '(datum._alignment == "left") ? 7 : -7'}},

      "transform": [
        {"filter": {"and": [{"not": "datum.delete"}, "datum.visible", "labelSystems"]}}
      ],

      "encoding": {
        "color": {
          "field": "_Domain",
          "legend": null,
          "scale": {
            "domain": domains,
            "range": colorRange,
          },
          "type": "nominal"
        },

          /*
        "opacity": {
          //"condition": {"value": 1, "selection": "selector001"},
          "value": 0.2
        },
        */

        "text": {"field": "System", "type": "nominal"},
        "x": {
          "field": xAxis,
          "type": xAxisType,
        },
        "y": {
          "field": yAxis,
          "type": "quantitative"
        }
      }
  });

  vegaEmbed("#" + id, vegaSpec, {actions: false, renderer: "canvas"}).then(function(result) {
    result.view.addEventListener("click", function(e, item) {
      if (!item) return;

      if (item.context) {
        var bounds = e.target.getBoundingClientRect();
        var x = e.clientX - bounds.left;
        var y = e.clientY - bounds.top; 
      }

      if (e.ctrlKey) {
        if (item.datum && item.datum.Link) {
          //window.open(item.datum.Link, "width=500,height=500,top=100,left=500");
          window.open(item.datum.Link);
        }
      }
    });

    onRender(result);
  }).catch(console.error);
}

function makeVisualizer(selector) {
  let container = _(document, selector);

  // Build the graph skeleton
  container.classList.add("graphContainer");
  container.innerHTML += '<div class="graph"><div class="vegaGraph" id="'+ makeId() +'"></div></div>';
  container.innerHTML += '<div class="legend"></div>';
  container.innerHTML += '<div class="options"><div class="optionsHeader">Options</div></div>';
  container.innerHTML += '<div class="dateslider"></div>';

  let graph      = _(container, ".graph");
  let vegaNode   = _(container, ".vegaGraph");
  let legend     = _(container, ".legend");
  let options    = _(container, ".options");
  let dateSlider = _(container, ".dateSlider");

  // Oh, God
  options.style.height = container.offsetHeight;

  container.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.keyCode == 13) { // Ctrl+Enter
      let v = visualizer;
      let result = visualizer.result;
      renderVega(v.nodes.vega.id, result.articles, result.eras, result.regressionData, params.xAxis, params.yAxis, params.plotRegressions, params.labelPoints, (result) => {v.view = result.view});
    }
  });

  function resizeOptions(targetWidth) {
    options.style.width = targetWidth;
    options.style.height = container.offsetHeight;
    closeButton.style.right = 0;

    let computedStyle = getComputedStyle(options);
    let countDown = 100;

    let timer = setInterval(() => {
      vegaNode.style.width = container.offsetWidth - parseInt(computedStyle.width);

      if (countDown-- < 0 || parseInt(computedStyle.width) == targetWidth) {
        clearInterval(timer);
      }

      // To force Vega to update :(
      window.dispatchEvent(new Event('resize'));
    }, 10);
  }

  let exportButton = html('<button class="exportButton">⭳</button>');
  exportButton.addEventListener("click", function() {
    if (visualizer.view) {
      visualizer.view.toImageURL('png').then(function(url) {
        var link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('download', 'trends.png');
        link.dispatchEvent(new MouseEvent('click'));
      }).catch(function(error) { /* error handling */ });
    }
  });
  graph.appendChild(exportButton);

  let optionsButton = html('<button class="optionsButton">&#9776;</button>');
  optionsButton.addEventListener("click", function() {
    resizeOptions(250);
  });
  graph.appendChild(optionsButton);

  let closeButton = html('<button class="closeButton">&times;</button>');
  closeButton.addEventListener("click", function() {
    resizeOptions(0);
  });
  _(options, ".optionsHeader").appendChild(closeButton);

  let visualizer = {
    nodes: {
      container: container,
      graph:     graph,
      vega:      vegaNode,
      legend:    legend,
      options:   options,
    },

    view: null,
    data: [],
    legend: {},
    layers: [],
    options: {},

    onChange: () => {},
  };

  visualizer.update = (v, options, objectsUpdated) => {
    let urlParams = {};
    let urlFields = [];

    for (let option in v.options) {
      let value = v.options[option];
      if (value instanceof Date) continue; // TODO
      //if (typeof(value) == "number" && Math.floor(value) != value) value = value.toFixed(5);
      urlFields.push(option + "=" + value);
    }

    let urlSearchParams = urlFields.join("&");
    window.history.replaceState('page', 'Title', "?" + urlSearchParams);

    visualizer.onChange(v, options, objectsUpdated);
  };

  visualizer.addDateSlider = function(optionNames, range) {
    for (let i = 0; i < optionNames.length; i++) {
      visualizer.options[optionNames[i]] = range[i];

      visualizer.onOptionSet[optionNames[i]] = (v => {
        visualizer.options[optionNames[i]] = v;
        console.log(v);
      });
    }

    addMultislider(dateSlider, {
      initialValues: {
        "startDate":      (range[0].getYear() - 1950) / (2023 - 1950),
        "eraTransition1": (range[0].getYear() - 1950) / (2023 - 1950),
        "eraTransition2": (range[1].getYear() - 1950) / (2023 - 1950),
        "endDate":        (range[2].getYear() - 1950) / (2023 - 1950),
      },
      onChange: (values, eventType) => {
        let startYear           = (1950 + values["startDate"] * (2023 - 1950));
        let endYear             = (1950 + values["endDate"] * (2023 - 1950));
        let startDlYear         = (1950 + values["eraTransition1"] * (2023 - 1950));
        let startLargeScaleYear = (1950 + values["eraTransition2"] * (2023 - 1950));

        visualizer.options["startDate"] = new Date(startYear, 1, 1);
        visualizer.options["endDate"] = new Date(endYear, 1, 1);
        visualizer.options["startDlEra"] = new Date(startDlYear, 1, 1);
        visualizer.options["startLargeScaleEra"] = new Date(startLargeScaleYear, 1, 1);

        if (true || eventType == "changed") {
          visualizer.update(visualizer, visualizer.options, ["startDlEra", "startLargeScaleEra"])
        }
      }
    });
  };

  visualizer.addSelector = function(label) {
    let node = html('<div class="option"><label class="optionLabel">' + label + '</label></div>');
    let selectNode = html('<select class="optionValue" value="'+ "--Select--" +'"></select>');
    node.appendChild(selectNode);

    visualizer.nodes.options.appendChild(node);

    let selector = {
      selectNode: selectNode,

      callbacks: {
      },

      addItem: (name, callback) => {
        selector.callbacks[name] = callback;
        selector.selectNode.appendChild(html('<option value="' + name + '">' + name + '</option>'));
      },

      select: (name) => {
        if (name in selector.callbacks) selector.callbacks[name](name);
      },
    };

    selectNode.addEventListener("input", () => {
      selector.select(selectNode.value);
    });

    return selector;
  };

  visualizer.addSelectOption = function(labelName, optionName, value, values) {
    value ||= values[0];
    visualizer.options[optionName] = value;

    let optionNode = html('<div class="option"><label class="optionLabel">' + labelName + '</label></div>');
    let select = html('<select class="optionValue" value="'+ value +'"></select>');
    optionNode.appendChild(select);

    for (let value of values) {
      select.appendChild(html('<option value="' + value + '">' + value + '</option>'));
    }

    visualizer.onOptionSet[optionName] = (v => {
      select.value = v;
      visualizer.options[optionName] = v;
    });

    select.addEventListener("input", () => {
      visualizer.options[optionName] = select.value;
      visualizer.update(visualizer, visualizer.options, [optionName])
    });

    visualizer.nodes.options.appendChild(optionNode);
  };

  visualizer.updateData = function(data, regressionData, categoryField) {
    visualizer.data = data;

    let categories = new Set();
    let visibleCategories = new Set();
    for (let row of data) {
      if (!row.deleted) categories.add(row[categoryField]);
      if (row.visible) visibleCategories.add(row[categoryField]);
    }

    for (let data of regressionData) {
      data.visible = visibleCategories.has(data.Domain);
    }

    for (let name in visualizer.legend) {
      if (!(name in visualizer.legend)) continue;

      if (categories.has(name) && visibleCategories.has(name)) {
        visualizer.legend[name].node.classList.remove("hidden");
      } else {
        visualizer.legend[name].node.classList.add("hidden");
      }
    }
  }

  visualizer.onOptionSet = {};

  visualizer.setOptions = function(params) {
    let optionNames = [];
    for (let optionName in params) {
      optionNames.push(optionName);
      if (visualizer.onOptionSet[optionName]) visualizer.onOptionSet[optionName](params[optionName]);
    }
    visualizer.update(visualizer, visualizer.options, optionNames);
  };

  visualizer.addBooleanOption = function(labelName, optionName, value) {
    value ||= false;
    visualizer.options[optionName] = value;

    let inputId = optionName;

    let optionNode = html('<div class="option"><label class="optionLabel" for="' + inputId + '">' + labelName + '</label></div>');
    let checkboxWrapper = html('<div class="checkboxWrapper"><input type="checkbox" '+ (value ? "checked" : "") +' class="optionValue" id="' + inputId+ '"></input></div>');
    let checkbox = _(checkboxWrapper, "input");
    optionNode.appendChild(checkboxWrapper);

    visualizer.onOptionSet[optionName] = (v => {
      checkbox.checked = v
      visualizer.options[optionName] = checkbox.checked;
    });

    checkbox.addEventListener("input", () => {
      visualizer.options[optionName] = checkbox.checked;
      visualizer.update(visualizer, visualizer.options, [optionName])
    });

    visualizer.nodes.options.appendChild(optionNode);
  };

  visualizer.addNumberOption = function(labelName, optionName, value) {
    value ||= 0;
    visualizer.options[optionName] = value;

    let inputId = optionName;

    let optionNode = html('<div class="option"><label class="optionLabel" for="' + inputId + '">' + labelName + '</label></div>');
    let input = html('<input type="number" value="'+ value +'" class="optionValue" id="' + inputId+ '"></input>');
    optionNode.appendChild(input);

    visualizer.onOptionSet[optionName] = (v => {
      input.value = v;
      visualizer.options[optionName] = parseFloat(input.value);
    });

    input.addEventListener("input", () => {
      visualizer.options[optionName] = parseFloat(input.value);
      visualizer.update(visualizer, visualizer.options, [optionName])
    });

    visualizer.nodes.options.appendChild(optionNode);
  };

  visualizer.addTextOption = function(labelName, optionName) {
    visualizer.options[optionName] = "";

    let inputId = optionName;

    let optionNode = html('<div class="option"><label class="optionLabel" for="' + inputId + '">' + labelName + '</label></div>');
    let input = html('<input type="text" class="optionValue" id="' + inputId + '"></input>');
    optionNode.appendChild(input);

    visualizer.onOptionSet[optionName] = (v => {
      input.value = v;
      visualizer.options[optionName] = input.value;
    });

    input.addEventListener("input", () => {
      visualizer.options[optionName] = input.value;
      visualizer.update(visualizer, visualizer.options, [optionName])
    });

    visualizer.nodes.options.appendChild(optionNode);
  };

  visualizer.addText = function(text) {
    let node = html('<div class="info">'+ text +'</div>');
    visualizer.nodes.options.appendChild(node);
  };

  visualizer.setLegend = function(categories) {
    for (let category of categories) {
      let svg;

      if (category.shape.charAt(0) == '#') {
        svg = '<svg class="icon" fill="none" stroke="'+ category.color +'" stroke-width="0.2"><use href="' + category.shape + '" /></svg>';
      } else {
        svg = '<svg class="icon" fill="none" stroke="'+ category.color +'" stroke-width="0.2" viewBox="-1 -1 2 2"><path d="'+ category.shape +'"/></svg>';
      }

      let legendItem = html('<div class="legendItem" style="color:' + category.color + '">' + svg + category.name + '</div>');

      legendItem.addEventListener("click", () => {
        legendItem.classList.toggle("disabled");

        let domainEnabled = !legendItem.classList.contains("disabled");
        domainsDisabled[category.name] = !domainEnabled;
        v.view.signal("domainsDisabled", domainsDisabled);
        console.log(visualizer.legend["All"]);

        for (let row of visualizer.data) {
          if (row._Domain == category.name) row.visible = domainEnabled;
        }

        for (let data of visualizer.result.regressionData) {
          if (data.Domain == category.name) data.visible = domainEnabled;
        }

        visualizer.view
         .change('data', vega.changeset().remove(() => true))
         .change('regression-lines', vega.changeset().remove(() => true))
         .runAsync();

        visualizer.view
         .change('data', vega.changeset().insert(visualizer.result.articles))
         .change('regression-lines', vega.changeset().insert(visualizer.result.regressionData))
         .runAsync();
      });

      domainsDisabled[category.name] = false;

      visualizer.legend[category.name] = {
        node: legendItem,
        disabled: true,
      };

      visualizer.nodes.legend.appendChild(legendItem);
    }
  };

  visualizer.showLegend = function(showIt) {
    if (showIt) visualizer.nodes.legend.classList.remove("hidden");
    else        visualizer.nodes.legend.classList.add("hidden");
  };

  visualizer.show = function() {
    let objectsUpdated = [];
    for (let key in visualizer.options) objectsUpdated.push(key);
    visualizer.update(visualizer, visualizer.options, objectsUpdated)
  };

  return visualizer;
}








/////////////////////////////////////////////////////
// Driver
/////////////////////////////////////////////////////

let v = makeVisualizer("#newGraph");

presets = [{'name': 'fig1', 'params': {'xAxis': 'Publication date', 'yAxis': 'Training compute (FLOPs)', 'startDate': new Date(1950, 01, 01), 'endDate': new Date(2022, 02, 01), 'startDlEra': new Date(2009, 12, 31), 'startLargeScaleEra': new Date(2015, 09, 01), 'splitDlEra': true, 'splitLargeScaleEra': true, 'citationThreshold': 0, 'separateCategories': false, 'otherDomainThreshold': 10, 'outliersAction': 'remove', 'largeScaleAction': 'label', 'bigAlphagoAction': 'ignore', 'recordSettersAction': 'ignore', 'lowOutliersZValueThreshold': -2, 'highOutliersZValueThreshold': 0.76, 'outlierWindowSize': 2, 'labelPoints': false, 'plotRegressions': true, 'labelEras': true}}, {'name': 'fig2', 'params': {'xAxis': 'Publication date', 'yAxis': 'Training compute (FLOPs)', 'startDate': new Date(1950, 01, 01), 'endDate': new Date(2022, 02, 01), 'startDlEra': new Date(2009, 12, 31), 'startLargeScaleEra': new Date(2015, 09, 01), 'splitDlEra': true, 'splitLargeScaleEra': true, 'citationThreshold': 0, 'separateCategories': true, 'otherDomainThreshold': 10, 'outliersAction': 'remove', 'largeScaleAction': 'label', 'bigAlphagoAction': 'ignore', 'recordSettersAction': 'ignore', 'lowOutliersZValueThreshold': -2, 'highOutliersZValueThreshold': 0.76, 'outlierWindowSize': 2, 'labelPoints': false, 'plotRegressions': false, 'labelEras': true}}, {'name': 'fig3', 'params': {'xAxis': 'Publication date', 'yAxis': 'Training compute (FLOPs)', 'startDate': new Date(1950, 01, 01), 'endDate': new Date(2022, 02, 01), 'startDlEra': new Date(2009, 12, 31), 'startLargeScaleEra': new Date(2024, 09, 01), 'splitDlEra': true, 'splitLargeScaleEra': true, 'citationThreshold': 0, 'separateCategories': false, 'otherDomainThreshold': 10, 'outliersAction': 'remove', 'largeScaleAction': 'ignore', 'bigAlphagoAction': 'ignore', 'recordSettersAction': 'ignore', 'lowOutliersZValueThreshold': -2, 'highOutliersZValueThreshold': 0.76, 'outlierWindowSize': 2, 'labelPoints': false, 'plotRegressions': true, 'labelEras': true}}, {'name': 'fig4', 'params': {'xAxis': 'Publication date', 'yAxis': 'Training compute (FLOPs)', 'startDate': new Date(2009, 12, 31), 'endDate': new Date(2022, 02, 01), 'startDlEra': new Date(2009, 12, 31), 'startLargeScaleEra': new Date(2015, 09, 01), 'splitDlEra': true, 'splitLargeScaleEra': true, 'citationThreshold': 0, 'separateCategories': false, 'otherDomainThreshold': 10, 'outliersAction': 'remove', 'largeScaleAction': 'label', 'bigAlphagoAction': 'ignore', 'recordSettersAction': 'ignore', 'lowOutliersZValueThreshold': -2, 'highOutliersZValueThreshold': 0.76, 'outlierWindowSize': 2, 'labelPoints': true, 'plotRegressions': true, 'labelEras': true}}, {'name': 'fig5', 'params': {'xAxis': 'Publication date', 'yAxis': 'Training compute (FLOPs)', 'startDate': new Date(2015, 09, 01), 'endDate': new Date(2022, 02, 01), 'startDlEra': new Date(2009, 12, 31), 'startLargeScaleEra': new Date(2015, 09, 01), 'splitDlEra': true, 'splitLargeScaleEra': true, 'citationThreshold': 0, 'separateCategories': false, 'otherDomainThreshold': 10, 'outliersAction': 'remove', 'largeScaleAction': 'isolate', 'bigAlphagoAction': 'ignore', 'recordSettersAction': 'ignore', 'lowOutliersZValueThreshold': -2, 'highOutliersZValueThreshold': 0.76, 'outlierWindowSize': 2, 'labelPoints': true, 'plotRegressions': true, 'labelEras': false}}, {'name': 'fig6', 'params': {'xAxis': 'Publication date', 'yAxis': 'Training compute (FLOPs)', 'startDate': new Date(1990, 01, 01), 'endDate': new Date(2022, 02, 01), 'startDlEra': new Date(2009, 12, 31), 'startLargeScaleEra': new Date(2015, 09, 01), 'splitDlEra': true, 'splitLargeScaleEra': true, 'citationThreshold': 0, 'separateCategories': false, 'otherDomainThreshold': 10, 'outliersAction': 'label', 'largeScaleAction': 'label', 'bigAlphagoAction': 'ignore', 'recordSettersAction': 'ignore', 'lowOutliersZValueThreshold': -2, 'highOutliersZValueThreshold': 0.76, 'outlierWindowSize': 2, 'labelPoints': false, 'plotRegressions': false, 'labelEras': true}}, {'name': 'fig7', 'params': {'xAxis': 'Publication date', 'yAxis': 'Training compute (FLOPs)', 'startDate': new Date(1950, 01, 01), 'endDate': new Date(2022, 02, 01), 'startDlEra': new Date(2009, 12, 31), 'startLargeScaleEra': new Date(2015, 09, 01), 'splitDlEra': true, 'splitLargeScaleEra': true, 'citationThreshold': 0, 'separateCategories': false, 'otherDomainThreshold': 10, 'outliersAction': 'ignore', 'largeScaleAction': 'ignore', 'bigAlphagoAction': 'remove', 'recordSettersAction': 'isolate', 'lowOutliersZValueThreshold': -2, 'highOutliersZValueThreshold': 0.76, 'outlierWindowSize': 2, 'labelPoints': true, 'plotRegressions': true, 'labelEras': true}}, {'name': 'fig8', 'params': {'xAxis': 'Publication date', 'yAxis': 'Training compute (FLOPs)', 'startDate': new Date(2009, 12, 31), 'endDate': new Date(2022, 02, 01), 'startDlEra': new Date(2009, 12, 31), 'startLargeScaleEra': new Date(2015, 09, 01), 'splitDlEra': true, 'splitLargeScaleEra': false, 'citationThreshold': 0, 'separateCategories': true, 'otherDomainThreshold': 10, 'outliersAction': 'remove', 'largeScaleAction': 'ignore', 'bigAlphagoAction': 'ignore', 'recordSettersAction': 'ignore', 'lowOutliersZValueThreshold': -2, 'highOutliersZValueThreshold': 0.76, 'outlierWindowSize': 2, 'labelPoints': false, 'plotRegressions': true, 'labelEras': true}}, {'name': 'fig10', 'params': {'xAxis': 'Publication date', 'yAxis': 'Training compute (FLOPs)', 'startDate': new Date(2012, 09, 01), 'endDate': new Date(2017, 12, 01), 'startDlEra': new Date(2012, 09, 01), 'startLargeScaleEra': new Date(2015, 09, 01), 'splitDlEra': true, 'splitLargeScaleEra': false, 'citationThreshold': 0, 'separateCategories': false, 'otherDomainThreshold': 10, 'outliersAction': 'remove', 'largeScaleAction': 'label', 'bigAlphagoAction': 'ignore', 'recordSettersAction': 'ignore', 'lowOutliersZValueThreshold': -2, 'highOutliersZValueThreshold': 0.76, 'outlierWindowSize': 2, 'labelPoints': false, 'plotRegressions': true, 'labelEras': true}}];


{

  let selector = v.addSelector("Presets");
  for (let preset of presets) {
    selector.addItem(preset.name, (name) => {
      console.log("setting", preset.name);
      v.setOptions(preset.params);
    });
  }

  //v.addDateSlider(["startDate", "startDlEra", "startLargeScaleEra", "endDate"], [new Date(1950, 1, 1), new Date(2009, 1, 1), new Date(2018, 1, 1), new Date(2023, 1, 1)]);
  v.addDateSlider(["startDate", "startDlEra", "startLargeScaleEra", "endDate"], [new Date(1950, 1, 1), new Date(1970, 1, 1), new Date(1985, 1, 1), new Date(2023, 1, 1)]);
  v.addSelectOption ("X axis",                      "xAxis",                       "Publication date", ["Publication date", "Parameters", "Training compute (FLOPs)", "Inference compute (FLOPs)", "Training compute per parameter (FLOPs)", "Training compute times parameters"]);
  v.addSelectOption ("Y axis",                      "yAxis",                       "Parameters", ["Parameters", "Training compute (FLOPs)", "Inference compute (FLOPs)", "Training compute per parameter (FLOPs)", "Training compute times parameters", "Training cost (2020 USD)"]);
  //v.addBooleanOption("Show legend",                 "showLegend",                  true);
  v.addBooleanOption("Plot regressions",            "plotRegressions",             true);
  v.addBooleanOption("Label the systems",           "labelPoints",                 false);
  v.addBooleanOption("Separate by category",        "separateCategories",          true);
  v.addBooleanOption("Label eras",                  "labelEras",                   true);
  v.addNumberOption ("Low Z value",                 "lowOutliersZValueThreshold");
  v.addNumberOption ("High Z value",                "highOutliersZValueThreshold");
  v.addNumberOption ("Outlier window size (years)", "outlierWindowSize");
  v.addNumberOption ("Citation threshold",          "citationThreshold");
  v.addNumberOption ("Others threshold",            "otherDomainThreshold");
  v.addNumberOption ("Besiroglu's threshold",       "besirogluThreshold");

  v.addSelectOption("Outliers",       "outliersAction",      "ignore", ["ignore", "label", "remove"]);
  v.addSelectOption("Large scale",    "largeScaleAction",    "ignore", ["ignore", "label", "isolate"]);
  v.addSelectOption("Big AlphaGo",    "bigAlphagoAction",    "ignore", ["ignore", "label", "remove"]);
  v.addSelectOption("Record setters", "recordSettersAction", "ignore", ["ignore", "label", "isolate"]);

  v.addTextOption("Filter by text",  "filterText");

  // Oh, Jesus, sweet Jesus
  let urlParamNames = [];

  let search = window.location.search.substring(1);

  if (search.length > 0) {
    let urlParams = JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) { return key===""?value:decodeURIComponent(value) })

    for (let [key, value] of Object.entries(urlParams)) {
      if (!(key in v.options)) continue;

      if (typeof(v.options[key]) == "boolean") {
        value = (value == "true") ? true : false;
      } else {
        value = (v.options[key].constructor)(value);
      }
      console.log(key, value);
      v.options[key] = value;
      urlParamNames.push(key);
    }
  }

  v.setLegend([
    {name: 'Vision',       color: '#6d904f', shape: '#cross'},
    {name: 'Language',     color: '#b96db8', shape: '#square'},
    {name: 'Games',        color: '#30a2da', shape: '#circle'},
    {name: 'Drawing',      color: '#8b8b8b', shape: 'M0,.5L.6,.8L.5,.1L1,-.3L.3,-.4L0,-1L-.3,-.4L-1,-.3L-.5,.1L-.6,.8L0,.5Z'},
    {name: 'Speech',       color: '#ff9e27', shape: '#triangle-down'},
    {name: 'Other',        color: '#e5ae38', shape: '#diamond'},
    {name: 'Large Scale',  color: '#fc4f30', shape: '#triangle'},
    {name: 'All',          color: '#30a2da', shape: '#circle'},
    {name: 'Outlier',      color: '#56cc60', shape: '#triangle-left'},
    {name: 'Record',       color: '#bfc11b', shape: '#triangle-up'},
    {name: 'AlphaGo Zero', color: '#ff9e27', shape: 'M0,.5L.6,.8L.5,.1L1,-.3L.3,-.4L0,-1L-.3,-.4L-1,-.3L-.5,.1L-.6,.8L0,.5Z'},
  ]);

  let prevXAxis;
  let prevYAxis;

  v.onChange = (v, options, objectsUpdated) => {
    //v.showLegend(options.showLegend);
    v.showLegend(true);

    params = {...params, ...options};
    let result = generateGraph(_database, params);

    let fieldsToCheck = [
      "System",
      "Reference",
      "_Domain",
      "Organization(s)",
      "Author(s)",
      "Publication date",
    ];

    for (let row of result.articles) {
      row.visible = true;
      if (!row.deleted && filteredOut(row, params.filterText, fieldsToCheck)) {
        row.visible = false;
      }
    }

    v.updateData(result.articles, result.regressionData, "_Domain");

    if (params.xAxis != prevXAxis || params.yAxis != prevYAxis || objectsUpdated.find((a) => a == "startDate") || objectsUpdated.find((a) => a == "endDate")) {
      renderVega(v.nodes.vega.id, result.articles, result.eras, result.regressionData, params.xAxis, params.yAxis, params.plotRegressions, params.labelPoints, (result) => {v.view = result.view});
      v.result = result;
      prevXAxis = params.xAxis;
      prevYAxis = params.yAxis;
    } else if (v.view) {
      // Oh, God

      v.result = result;

      v.view.signal("labelSystems", params.labelPoints);

      v.view.change('data', vega.changeset().remove(() => true));
      v.view.change('regression-lines', vega.changeset().remove(() => true));
      v.view.runAsync();

      v.view.change('data', vega.changeset().insert(result.articles));
      if (params.plotRegressions) {
        v.view.change('regression-lines', vega.changeset().insert(result.regressionData));
      }
      v.view.runAsync();

      let changeSet = vega.changeset().remove(() => true);
      v.view.change('data-eras', changeSet).run();
      if (params.labelEras) {
        changeSet = vega.changeset().insert(result.eras);
        v.view.change('data-eras', changeSet).runAsync();
      }
    }
  };

  v.show();
}

function filteredOut(row, filterText, fieldsToCheck) {
  if (filterText) {
    let regex = new RegExp(filterText, "gi")

    for (let field of fieldsToCheck) {
      if (!(field in row)) {
        continue;
      }

      if (row[field].toString().match(regex)) {
        return false;
        break;
      }
    }

    return true;
  }

  return false;
}


