$(function () {
  // Attach click event to logout button
  $("#btnLogOut").click(logout);

  // Fetch user information
  $.ajax({
    url: "/users/me",
    method: "GET",
    headers: { "x-auth": window.localStorage.getItem("token") },
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
      // Display welcome message with user's email
      $("#welcomeMessage").html(`Welcome, ${data.email}`);
      // Populate device dropdowns
      populateDeviceDropdown(data.devices);
      populateDeleteDeviceDropdown(data.devices);
      // Fetch and display measurement settings
      fetchMeasurementSettings();
      // Fetch and display physicians
      fetchPhysicians(data.physician);
      // Display the current physician
      displayCurrentPhysician(data.physician);
      console.log(data);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      // Redirect to display page on failure
      window.location.replace("display.html");
    });

  // Handle tab navigation
  $(".nav-tabs a").click(function (e) {
    e.preventDefault();
    $(".nav-tabs li").removeClass("active");
    $(this).parent().addClass("active");
    $(".tab-content").removeClass("active");
    $($(this).attr("href")).addClass("active");
  });
});

/**
 * Populates the device dropdown with the given list of devices.
 *
 * @param {Array} devices - An array of device objects.
 * @param {string} devices[].device_id - The ID of the device.
 */
function populateDeviceDropdown(devices) {
  const deviceSelect = $("#deviceSelect"); // Get the device select dropdown element
  deviceSelect.empty(); // Clear any existing options
  devices.forEach((device) => {
    // Iterate over each device
    deviceSelect.append(
      $("<option></option>") // Create a new option element
        .attr("value", device.device_id) // Set the value attribute to the device ID
        .text(device.device_id) // Set the text content to the device ID
    );
  });
  deviceSelect.change(fetchMeasurementSettings); // Attach change event to fetch measurement settings when a device is selected
}

/**
 * Populates the delete device dropdown with a list of devices.
 *
 * @param {Array} devices - An array of device objects.
 * @param {string} devices[].device_id - The ID of the device.
 */
function populateDeleteDeviceDropdown(devices) {
  const deleteDeviceSelect = $("#deleteDeviceSelect"); // Get the delete device select dropdown element
  deleteDeviceSelect.empty(); // Clear any existing options
  devices.forEach((device) => {
    // Iterate over each device
    deleteDeviceSelect.append(
      $("<option></option>") // Create a new option element
        .attr("value", device.device_id) // Set the value attribute to the device ID
        .text(device.device_id) // Set the text content to the device ID
    );
  });
}

/**
 * Fetches measurement settings for the selected device and updates the UI with the retrieved data.
 * 
 * This function retrieves the measurement settings (measurement interval, start time, and end time)
 * for the device selected in the #deviceSelect dropdown. It sends an AJAX GET request to the server
 * with the selected device ID and includes an authentication token in the request headers.
 * 
 * On a successful response, it updates the UI elements with the retrieved measurement settings.
 * If the request fails, it logs an error message to the console.
 */
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

/**
 * Updates the user's password by sending a request to the server.
 * 
 * This function performs the following steps:
 * 1. Retrieves the current password, new password, and confirm password from the input fields.
 * 2. Validates that all fields are filled.
 * 3. Checks if the new password and confirm password match.
 * 4. Ensures the new password is strong enough using zxcvbn.
 * 5. Sends an AJAX POST request to update the password on the server.
 * 6. Displays a success message if the password is updated successfully.
 * 7. Displays an error message if the password update fails.
 * 
 * @function
 */
function updatePassword() {
  const currentPassword = $("#currentPassword").val();
  const newPassword = $("#newPassword").val();
  const confirmPassword = $("#confirmPassword").val();

  console.log(currentPassword, newPassword, confirmPassword); // Log the passwords for debugging

  // Check if any of the password fields are empty
  if (!currentPassword || !newPassword || !confirmPassword) {
    window.alert("All fields are required."); // Alert the user if any field is empty
    return; // Exit the function
  }

  // Check if the new password and confirm password match
  if (newPassword !== confirmPassword) {
    window.alert("Passwords do not match."); // Alert the user if passwords do not match
    return; // Exit the function
  }

  // Check the strength of the new password using zxcvbn
  if (zxcvbn($("#newPassword").val()).score < 3) {
    window.alert("Password should be strong"); // Alert the user if the password is not strong enough
    return; // Exit the function
  }

  // Send an AJAX request to update the password
  $.ajax({
    url: "/users/update-password", // Endpoint to update the password
    method: "POST", // HTTP method
    headers: { "x-auth": window.localStorage.getItem("token") }, // Authentication token
    contentType: "application/json", // Content type
    data: JSON.stringify({
      currentPassword, // Current password
      newPassword, // New password
    }),
    dataType: "json", // Expected response data type
  })
    .done(function (data) {
      $("#passwordUpdateStatus").html("Password updated successfully."); // Display success message
    })
    .fail(function (jqXHR) {
      $("#passwordUpdateStatus").html(
        "Failed to update password: " + jqXHR.responseText // Display error message
      );
    });
}

/**
 * Updates the measurement settings for a selected device by sending an AJAX request to the server.
 * The function retrieves values from the DOM elements with IDs 'deviceSelect', 'measurementInterval', 
 * 'startTime', and 'endTime'. If any of these values are missing, an alert is shown to the user.
 * 
 * The AJAX request is sent to the endpoint '/users/update-measurement-settings' with the method 'POST'.
 * The request includes a JSON payload containing the device ID, measurement interval, start time, and end time.
 * The request also includes an authentication token retrieved from local storage.
 * 
 * On success, a success message is logged to the console and displayed in the DOM element with ID 'measurementUpdateStatus'.
 * On failure, an error message is logged to the console and displayed in the same DOM element.
 */
function updateMeasurementSettings() {
  const selectedDeviceId = $("#deviceSelect").val();
  const measurementInterval = $("#measurementInterval").val();
  const startTime = $("#startTime").val();
  const endTime = $("#endTime").val();

  // Check if any of the measurement settings fields are empty
  if (!measurementInterval || !startTime || !endTime) {
    window.alert("All fields are required."); // Alert the user if any field is empty
    return; // Exit the function
  }

  // Send an AJAX request to update the measurement settings
  $.ajax({
    url: "/users/update-measurement-settings", // Endpoint to update measurement settings
    method: "POST", // HTTP method
    headers: { "x-auth": window.localStorage.getItem("token") }, // Authentication token
    contentType: "application/json", // Content type
    data: JSON.stringify({
      device_id: selectedDeviceId, // Device ID
      measurementInterval, // Measurement interval
      startTime, // Start time
      endTime, // End time
    }),
    dataType: "json", // Expected response data type
  })
    .done(function (data) {
      console.log("AJAX request succeeded:", data); // Log success message
      $("#measurementUpdateStatus").html(
        "Measurement settings updated successfully." // Display success message
      );
    })
    .fail(function (jqXHR) {
      console.log("AJAX request failed:", jqXHR.responseText); // Log error message
      $("#measurementUpdateStatus").html(
        "Failed to update measurement settings: " + jqXHR.responseText // Display error message
      );
    });
}

/**
 * Adds a new device by sending a POST request to the server with the device details.
 * The device details are retrieved from the input fields with IDs: newDeviceId, newMeasurementInterval, newStartTime, and newEndTime.
 * If any of the fields are empty, an alert is shown and the function returns early.
 * On successful addition of the device, the device is added to the device select dropdown and a success message is displayed.
 * On failure, an error message is displayed.
 */
function addDevice() {
  const device_id = $("#newDeviceId").val();
  const measurementInterval = $("#newMeasurementInterval").val();
  const startTime = $("#newStartTime").val();
  const endTime = $("#newEndTime").val();

  // Check if any of the device fields are empty
  if (!device_id || !measurementInterval || !startTime || !endTime) {
    window.alert("All fields are required."); // Alert the user if any field is empty
    return; // Exit the function
  }

  // Send an AJAX request to add the new device
  $.ajax({
    url: "/users/add-device", // Endpoint to add the device
    method: "POST", // HTTP method
    headers: { "x-auth": window.localStorage.getItem("token") }, // Authentication token
    contentType: "application/json", // Content type
    data: JSON.stringify({
      device_id, // Device ID
      measurementInterval, // Measurement interval
      startTime, // Start time
      endTime, // End time
    }),
    dataType: "json", // Expected response data type
  })
    .done(function (data) {
      console.log("Device added successfully:", data); // Log success message
      // Add the new device to the device select dropdown
      $("#deviceSelect").append(
        $("<option></option>") // Create a new option element
          .attr("value", data.device_id) // Set the value attribute to the device ID
          .text(data.device_id) // Set the text content to the device ID
      );
      $("#deviceSelect").val(data.device_id).change(); // Set the new device as selected and trigger change event
      $("#deviceAddStatus").html("Device added successfully."); // Display success message
    })
    .fail(function (jqXHR) {
      console.log("Failed to add device:", jqXHR.responseText); // Log error message
      $("#deviceAddStatus").html("Failed to add device: " + jqXHR.responseText); // Display error message
    });
}

/**
 * Deletes a selected device by making an AJAX DELETE request.
 * 
 * This function retrieves the selected device ID from a dropdown menu,
 * sends a DELETE request to the server to remove the device, and updates
 * the UI based on the success or failure of the request.
 * 
 * @function deleteDevice
 * @returns {void}
 */
function deleteDevice() {
  const selectedDeviceId = $("#deleteDeviceSelect").val();

  if (!selectedDeviceId) {
    window.alert("Please select a device to delete."); // Alert the user if no device is selected
    return; // Exit the function
  }

  // Send an AJAX request to delete the selected device
  $.ajax({
    url: `/users/delete-device/${selectedDeviceId}`, // Endpoint to delete the device
    method: "DELETE", // HTTP method
    headers: { "x-auth": window.localStorage.getItem("token") }, // Authentication token
    dataType: "json", // Expected response data type
  })
    .done(function (data) {
      console.log("Device deleted successfully:", data); // Log success message
      $(`#deviceSelect option[value='${selectedDeviceId}']`).remove(); // Remove the device from the device select dropdown
      $(`#deleteDeviceSelect option[value='${selectedDeviceId}']`).remove(); // Remove the device from the delete device select dropdown
      $("#deviceDeleteStatus").html("Device deleted successfully."); // Display success message
    })
    .fail(function (jqXHR) {
      console.log("Failed to delete device:", jqXHR.responseText); // Log error message
      $("#deviceDeleteStatus").html(
        "Failed to delete device: " + jqXHR.responseText // Display error message
      );
    });
}

/**
 * Fetches the list of physicians from the server and populates the physician dropdown.
 *
 * @param {string} currentPhysicianId - The ID of the currently selected physician.
 * @returns {void}
 */
function fetchPhysicians(currentPhysicianId) {
  $.ajax({
    url: "/physicians", // Endpoint to fetch the list of physicians
    method: "GET", // HTTP method
    headers: { "x-auth": window.localStorage.getItem("token") }, // Authentication token
    dataType: "json", // Expected response data type
  })
    .done(function (data) {
      populatePhysicianDropdown(data.physicians, currentPhysicianId); // Populate the physician dropdown with the fetched data
    })
    .fail(function (jqXHR) {
      console.error("Failed to fetch physicians: " + jqXHR.responseText); // Log error message if the request fails
    });
}
/**
 * Populates a dropdown menu with a list of physicians and highlights the currently selected physician.
 *
 * @param {Array} physicians - An array of physician objects.
 * @param {string} physicians[].email - The email of the physician.
 * @param {string} physicians[]._id - The unique identifier of the physician.
 * @param {string} currentPhysicianId - The unique identifier of the currently selected physician.
 */
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

/**
 * Assigns a physician to the user based on the selected physician ID from the dropdown.
 * 
 * This function retrieves the selected physician ID from the dropdown with the ID "physicianSelect".
 * If no physician is selected, it alerts the user to select a physician.
 * It then sends an AJAX POST request to the server to assign the physician to the user.
 * 
 * On successful assignment, it logs the success message and updates the HTML element with ID "physicianAssignStatus".
 * It also reloads the page to reflect the changes.
 * 
 * On failure, it logs the error message and updates the HTML element with ID "physicianAssignStatus" with the error message.
 */
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

/**
 * Displays the current physician's email or a default message if no physician is assigned.
 *
 * @param {string} currentPhysicianId - The ID of the current physician.
 */
function displayCurrentPhysician(currentPhysicianId) {
  if (!currentPhysicianId) {
    $("#currentPhysicianStatus").html("Assigned Physician: None");
    return;
  }

  // Send an AJAX request to fetch the current physician's details
  $.ajax({
    url: `/physicians/${currentPhysicianId}`, // Endpoint to fetch the physician details
    method: "GET", // HTTP method
    headers: { "x-auth": window.localStorage.getItem("token") }, // Authentication token
    dataType: "json", // Expected response data type
  })
    .done(function (data) {
      // Check if the request was successful and the physician data is available
      if (data.success && data.physician) {
        // Display the physician's email
        $("#currentPhysicianStatus").html(
          `Assigned Physician: ${data.physician.email}`
        );
      } else {
        // Display a default message if no physician is assigned
        $("#currentPhysicianStatus").html("Assigned Physician: None");
      }
    })
    .fail(function (jqXHR) {
      // Log an error message if the request fails
      console.error("Failed to fetch current physician: " + jqXHR.responseText);
      // Display a default message if the request fails
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
