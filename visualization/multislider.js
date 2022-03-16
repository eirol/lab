function addMultislider(div, params) {
  div.classList.add("multislider");

  div.innerHTML += '<div class="background"></div>';
  div.innerHTML += '<div class="handle startDate"></div>';
  div.innerHTML += '<div class="string string1"></div>';
  div.innerHTML += '<div class="handle eraTransition1"></div>';
  div.innerHTML += '<div class="string string2"></div>';
  div.innerHTML += '<div class="handle eraTransition2"></div>';
  div.innerHTML += '<div class="string string3"></div>';
  div.innerHTML += '<div class="handle endDate"></div>';
  // deal with it

  params = params || {};
  onChange = params.onChange || function() {};

  function _(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  let slider = div;

  $(".handle").css("bottom", -14 + 4);

  let values = params.values || {
    "startDate": .0,
    "eraTransition1": .100,
    "eraTransition2": .250,
    "endDate": 1.0,
  };

  let handleDict = {};
  for (let name in handleDict) {
    handleDict[name] = _("." + name);
  }

  for (let name in values) {
    _("." + name).style.left = (100*values[name]) + "%";
  }

  addEventListener('input', e => {
    let t = e.target;
  }, false);

  $(".handle").draggable({
    axis: "x",
    containment: "parent",
    drag: function(e, ui) {
      updateSlider();
      onChange(values, "changing");
    },
    start: function(e, ui) {
      ui.helper.addClass("grabbing");
    },
    stop: function(e, ui) {
      ui.helper.removeClass("grabbing");
      onChange(values, "changed");
    },
  });

  // TODO IE
  let resizeObserver = new ResizeObserver(entries => {
    for (let name in values) {
      handleDict[name].style.left = (100*values[name]) + "%";
    }

    // OH GOD
    let dx = 14;

    $(".string1").css("left",  $(handleDict["startDate"]).position().left + dx);
    $(".string1").css("width", $(handleDict["eraTransition1"]).position().left - $(handleDict["startDate"]).position().left);

    $(".string2").css("left",  $(handleDict["eraTransition1"]).position().left + dx);
    $(".string2").css("width", $(handleDict["eraTransition2"]).position().left - $(handleDict["eraTransition1"]).position().left);

    $(".string3").css("left",  $(handleDict["eraTransition2"]).position().left + dx);
    $(".string3").css("width", $(handleDict["endDate"]).position().left - $(handleDict["eraTransition2"]).position().left);
  });

  resizeObserver.observe(slider);

  function updateSlider() {
    let handles = $(".handle").toArray();
    handles.sort((a, b) => parseInt($(a).position().left) - parseInt($(b).position().left));

    startDateHandle      = handles[0];
    eraTransition1Handle = handles[1];
    eraTransition2Handle = handles[2];
    endDateHandle        = handles[3];

    handleDict["startDate"]      = startDateHandle;
    handleDict["eraTransition1"] = eraTransition1Handle;
    handleDict["eraTransition2"] = eraTransition2Handle;
    handleDict["endDate"]        = endDateHandle;

    for (let name in values) {
      values[name] = parseInt($(handleDict[name]).position().left)/$(slider).width();
    }

    let dx = 14;

    $(".string1").css("left",  $(handleDict["startDate"]).position().left + dx);
    $(".string1").css("width", $(handleDict["eraTransition1"]).position().left - $(handleDict["startDate"]).position().left);

    $(".string2").css("left",  $(handleDict["eraTransition1"]).position().left + dx);
    $(".string2").css("width", $(handleDict["eraTransition2"]).position().left - $(handleDict["eraTransition1"]).position().left);

    $(".string3").css("left",  $(handleDict["eraTransition2"]).position().left + dx);
    $(".string3").css("width", $(handleDict["endDate"]).position().left - $(handleDict["eraTransition2"]).position().left);
  }

  updateSlider();
}
