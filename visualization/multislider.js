function addMultislider(div, params) {
  div.classList.add("multislider");

  div.innerHTML += '<div class="background"></div>';
  div.innerHTML += '<div class="handle startDate"></div>';
  div.innerHTML += '<div class="string string1"></div>';
  div.innerHTML += '<div class="handle startDlEra"></div>';
  div.innerHTML += '<div class="string string2"></div>';
  div.innerHTML += '<div class="handle startLargeScaleEra"></div>';
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
    "startDlEra": .100,
    "startLargeScaleEra": .250,
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
    $(".string1").css("width", $(handleDict["startDlEra"]).position().left - $(handleDict["startDate"]).position().left);

    $(".string2").css("left",  $(handleDict["startDlEra"]).position().left + dx);
    $(".string2").css("width", $(handleDict["startLargeScaleEra"]).position().left - $(handleDict["startDlEra"]).position().left);

    $(".string3").css("left",  $(handleDict["startLargeScaleEra"]).position().left + dx);
    $(".string3").css("width", $(handleDict["endDate"]).position().left - $(handleDict["startLargeScaleEra"]).position().left);
  });

  resizeObserver.observe(slider);

  function set(name, value) {
    values[name] = value;
    _("." + name).style.left = (100*value) + "%";
    updateSlider();
  }

  function updateSlider() {
    let handles = $(".handle").toArray();
    handles.sort((a, b) => parseInt($(a).position().left) - parseInt($(b).position().left));

    startDateHandle      = handles[0];
    eraTransition1Handle = handles[1];
    eraTransition2Handle = handles[2];
    endDateHandle        = handles[3];

    handleDict["startDate"]          = startDateHandle;
    handleDict["startDlEra"]         = eraTransition1Handle;
    handleDict["startLargeScaleEra"] = eraTransition2Handle;
    handleDict["endDate"]            = endDateHandle;

    for (let name in values) {
      values[name] = parseInt($(handleDict[name]).position().left)/$(slider).width();
    }

    let dx = 14;

    $(".string1").css("left",  $(handleDict["startDate"]).position().left + dx);
    $(".string1").css("width", $(handleDict["startDlEra"]).position().left - $(handleDict["startDate"]).position().left);

    $(".string2").css("left",  $(handleDict["startDlEra"]).position().left + dx);
    $(".string2").css("width", $(handleDict["startLargeScaleEra"]).position().left - $(handleDict["startDlEra"]).position().left);

    $(".string3").css("left",  $(handleDict["startLargeScaleEra"]).position().left + dx);
    $(".string3").css("width", $(handleDict["endDate"]).position().left - $(handleDict["startLargeScaleEra"]).position().left);
  }

  updateSlider();

  let multislider = {
    set: set,
  };

  return multislider;
}
