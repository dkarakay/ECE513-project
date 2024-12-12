$(function () {
  $("#btnLogOut").click(logout);

  $.ajax({
    url: "/users/me",
    method: "GET",
    headers: { "x-auth": window.localStorage.getItem("token") },
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
      $("#welcomeMessage").html(`Welcome, ${data.email}`);
      populateDeviceDropdown(data.devices);
      populateDeleteDeviceDropdown(data.devices);
      fetchMeasurementSettings();
      fetchPhysicians(data.physician);
      displayCurrentPhysician(data.physician); // Display the current physician
      console.log(data);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      window.location.replace("display.html");
    });

  $(".nav-tabs a").click(function (e) {
    e.preventDefault();
    $(".nav-tabs li").removeClass("active");
    $(this).parent().addClass("active");
    $(".tab-content").removeClass("active");
    $($(this).attr("href")).addClass("active");
  });
});

function populateDeviceDropdown(devices) {
  const deviceSelect = $("#deviceSelect");
  deviceSelect.empty();
  devices.forEach((device) => {
    deviceSelect.append(
      $("<option></option>")
        .attr("value", device.device_id)
        .text(device.device_id)
    );
  });
  deviceSelect.change(fetchMeasurementSettings);
}

function populateDeleteDeviceDropdown(devices) {
  const deleteDeviceSelect = $("#deleteDeviceSelect");
  deleteDeviceSelect.empty();
  devices.forEach((device) => {
    deleteDeviceSelect.append(
      $("<option></option>")
        .attr("value", device.device_id)
        .text(device.device_id)
    );
  });
}

function fetchMeasurementSettings() {
  const selectedDeviceId = $("#deviceSelect").val();
  $.ajax({
    url: `/users/measurement-settings/${selectedDeviceId}`,
    method: "GET",
    headers: { "x-auth": window.localStorage.getItem("token") },
    dataType: "json",
  })
    .done(function (data) {
      $("#measurementInterval").val(data.measurementInterval);
      $("#startTime").val(data.startTime);
      $("#endTime").val(data.endTime);
    })
    .fail(function (jqXHR) {
      console.error(
        "Failed to fetch measurement settings: " + jqXHR.responseText
      );
    });
}

function updatePassword() {
  const currentPassword = $("#currentPassword").val();
  const newPassword = $("#newPassword").val();
  const confirmPassword = $("#confirmPassword").val();

  console.log(currentPassword, newPassword, confirmPassword);

  if (!currentPassword || !newPassword || !confirmPassword) {
    window.alert("All fields are required.");
    return;
  }

  if (newPassword !== confirmPassword) {
    window.alert("Passwords do not match.");
    return;
  }

  if (zxcvbn($("#newPassword").val()).score < 3) {
    window.alert("Password should be strong");
    return;
  }

  $.ajax({
    url: "/users/update-password",
    method: "POST",
    headers: { "x-auth": window.localStorage.getItem("token") },
    contentType: "application/json",
    data: JSON.stringify({
      currentPassword,
      newPassword,
    }),
    dataType: "json",
  })
    .done(function (data) {
      $("#passwordUpdateStatus").html("Password updated successfully.");
    })
    .fail(function (jqXHR) {
      $("#passwordUpdateStatus").html(
        "Failed to update password: " + jqXHR.responseText
      );
    });
}

function updateMeasurementSettings() {
  const selectedDeviceId = $("#deviceSelect").val();
  const measurementInterval = $("#measurementInterval").val();
  const startTime = $("#startTime").val();
  const endTime = $("#endTime").val();

  if (!measurementInterval || !startTime || !endTime) {
    window.alert("All fields are required.");
    return;
  }

  $.ajax({
    url: "/users/update-measurement-settings",
    method: "POST",
    headers: { "x-auth": window.localStorage.getItem("token") },
    contentType: "application/json",
    data: JSON.stringify({
      device_id: selectedDeviceId,
      measurementInterval,
      startTime,
      endTime,
    }),
    dataType: "json",
  })
    .done(function (data) {
      console.log("AJAX request succeeded:", data);
      $("#measurementUpdateStatus").html(
        "Measurement settings updated successfully."
      );
    })
    .fail(function (jqXHR) {
      console.log("AJAX request failed:", jqXHR.responseText);
      $("#measurementUpdateStatus").html(
        "Failed to update measurement settings: " + jqXHR.responseText
      );
    });
}

function addDevice() {
  const device_id = $("#newDeviceId").val();
  const measurementInterval = $("#newMeasurementInterval").val();
  const startTime = $("#newStartTime").val();
  const endTime = $("#newEndTime").val();

  if (!device_id || !measurementInterval || !startTime || !endTime) {
    window.alert("All fields are required.");
    return;
  }

  $.ajax({
    url: "/users/add-device",
    method: "POST",
    headers: { "x-auth": window.localStorage.getItem("token") },
    contentType: "application/json",
    data: JSON.stringify({
      device_id,
      measurementInterval,
      startTime,
      endTime,
    }),
    dataType: "json",
  })
    .done(function (data) {
      console.log("Device added successfully:", data);
      $("#deviceSelect").append(
        $("<option></option>")
          .attr("value", data.device_id)
          .text(data.device_id)
      );
      $("#deviceSelect").val(data.device_id).change();
      $("#deviceAddStatus").html("Device added successfully.");
    })
    .fail(function (jqXHR) {
      console.log("Failed to add device:", jqXHR.responseText);
      $("#deviceAddStatus").html("Failed to add device: " + jqXHR.responseText);
    });
}

function deleteDevice() {
  const selectedDeviceId = $("#deleteDeviceSelect").val();

  if (!selectedDeviceId) {
    window.alert("Please select a device to delete.");
    return;
  }

  $.ajax({
    url: `/users/delete-device/${selectedDeviceId}`,
    method: "DELETE",
    headers: { "x-auth": window.localStorage.getItem("token") },
    dataType: "json",
  })
    .done(function (data) {
      console.log("Device deleted successfully:", data);
      $(`#deviceSelect option[value='${selectedDeviceId}']`).remove();
      $(`#deleteDeviceSelect option[value='${selectedDeviceId}']`).remove();
      $("#deviceDeleteStatus").html("Device deleted successfully.");
    })
    .fail(function (jqXHR) {
      console.log("Failed to delete device:", jqXHR.responseText);
      $("#deviceDeleteStatus").html(
        "Failed to delete device: " + jqXHR.responseText
      );
    });
}

function fetchPhysicians(currentPhysicianId) {
  $.ajax({
    url: "/physicians",
    method: "GET",
    headers: { "x-auth": window.localStorage.getItem("token") },
    dataType: "json",
  })
    .done(function (data) {
      populatePhysicianDropdown(data.physicians, currentPhysicianId);
    })
    .fail(function (jqXHR) {
      console.error("Failed to fetch physicians: " + jqXHR.responseText);
    });
}
function populatePhysicianDropdown(physicians, currentPhysicianId) {
  const physicianSelect = $("#physicianSelect");
  physicianSelect.empty();
  physicians.forEach((physician) => {
    const option = $("<option></option>")
      .attr("value", physician._id)
      .text(physician.email);
    if (physician._id === currentPhysicianId) {
      option.css("background-color", "#d4edda"); // Greenish color
    }
    physicianSelect.append(option);
  });
}

function assignPhysician() {
  const physicianId = $("#physicianSelect").val();

  if (!physicianId) {
    window.alert("Please select a physician.");
    return;
  }

  $.ajax({
    url: "/users/add-physician",
    method: "POST",
    headers: { "x-auth": window.localStorage.getItem("token") },
    contentType: "application/json",
    data: JSON.stringify({
      physicianId,
    }),
    dataType: "json",
  })
    .done(function (data) {
      console.log("Physician assigned successfully:", data);
      $("#physicianAssignStatus").html("Physician assigned successfully.");
      location.reload();
    })
    .fail(function (jqXHR) {
      console.log("Failed to assign physician:", jqXHR.responseText);
      $("#physicianAssignStatus").html(
        "Failed to assign physician: " + jqXHR.responseText
      );
    });
}

function displayCurrentPhysician(currentPhysicianId) {
  if (!currentPhysicianId) {
    $("#currentPhysicianStatus").html("Assigned Physician: None");
    return;
  }

  $.ajax({
    url: `/physicians/${currentPhysicianId}`,
    method: "GET",
    headers: { "x-auth": window.localStorage.getItem("token") },
    dataType: "json",
  })
    .done(function (data) {
      if (data.success && data.physician) {
        $("#currentPhysicianStatus").html(
          `Assigned Physician: ${data.physician.email}`
        );
      } else {
        $("#currentPhysicianStatus").html("Assigned Physician: None");
      }
    })
    .fail(function (jqXHR) {
      console.error("Failed to fetch current physician: " + jqXHR.responseText);
      $("#currentPhysicianStatus").html("Assigned Physician: None");
    });
}

$(function () {
  $("#btnUpdatePassword").click(updatePassword);
  $("#btnUpdateMeasurementSettings").click(updateMeasurementSettings);
  $("#btnAddDevice").click(addDevice);
  $("#btnDeleteDevice").click(deleteDevice);
  $("#btnAssignPhysician").click(assignPhysician);
});

function logout() {
  localStorage.removeItem("token");
  window.location.replace("index.html");
}
