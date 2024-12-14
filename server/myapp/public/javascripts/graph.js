//Additional JavaScript for Chart Rendering and UI Handling -->
let heartRateChart = null;
let spo2Chart = null;
let weeklySummaryChart = null;

const token = window.localStorage.getItem("token");

$(document).ready(function () {
  // Ensure the token is stored in localStorage
  if (!token) {
    alert("You are not logged in!");
    window.location.replace("login.html");
    return;
  }

  const deviceSelect = $("#deviceSelect");

  // Fetch the user's devices and populate the dropdown
  $.ajax({
    url: "/users/me",
    method: "GET",
    headers: { "x-auth": token },
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
      populateDeviceDropdown(data.devices);
      fetchLatestSensorData();
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.error("Error fetching user devices:", errorThrown);
      alert("Failed to fetch user devices. Please try again.");
    });

  // Use a MutationObserver to detect when sensor.js populates the dropdown
  const observer = new MutationObserver(function (mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // Devices have been added
        initializeApp();
        // Disconnect the observer after initialization
        observer.disconnect();
        break;
      }
    }
  });

  // Start observing the deviceSelect for child node additions
  observer.observe(deviceSelect[0], { childList: true });

  // Additionally, handle the case where sensor.js might have already populated the dropdown
  if (deviceSelect.find("option").length > 0) {
    initializeApp();
    observer.disconnect();
  }

  const today = new Date()
    .toLocaleDateString("en-CA", {
      timeZone: "America/Phoenix", // Tucson follows the same time zone as Phoenix
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("-")
    .join("-");
  $("#selectedDate").val(today);
});


/**
 * Populates the device dropdown menu with a list of devices.
 * If there are multiple devices, an "All Devices" option is added.
 * When the dropdown selection changes, it triggers fetching the latest sensor data.
 *
 * @param {Array} devices - An array of device objects.
 * @param {string} devices[].device_id - The unique identifier for a device.
 */
function populateDeviceDropdown(devices) {
  const deviceSelect = $("#deviceSelect");
  deviceSelect.empty();
  // If there are multiple devices, add an "All Devices" option
  if (devices.length > 1) {
    deviceSelect.append(
      $("<option></option>").attr("value", "all").text("All Devices")
    );
  }

  // Append each device to the dropdown
  devices.forEach((device) => {
    deviceSelect.append(
      $("<option></option>")
        .attr("value", device.device_id)
        .text(device.device_id)
    );
  });

  // Add change event listener to fetch latest sensor data when a device is selected
  deviceSelect.change(function () {
    fetchLatestSensorData();
  });
}

/**
 * Fetches the latest sensor data for the selected device and updates the UI with the retrieved data.
 * If the selected device is "all", it fetches data for all devices.
 * If the selected device is a specific device, it fetches data for that device.
 * 
 * The function makes an AJAX GET request to the appropriate endpoint and handles the response.
 * If the response contains valid sensor data, it displays the data in the UI.
 * If the response does not contain valid sensor data, it displays a "No data available" message.
 * 
 * In case of an error during the AJAX request, it logs the error to the console and shows an alert to the user.
 * 
 * @function fetchLatestSensorData
 */
function fetchLatestSensorData() {
  const selectedDeviceId = $("#deviceSelect").val();
  // Determine the URL based on the selected device ID
  const url =
    selectedDeviceId === "all"
      ? "/sensor/latest"
      : `/sensor/latest?device_id=${selectedDeviceId}`;

  // Make an AJAX GET request to fetch the latest sensor data
  $.ajax({
    url: url,
    method: "GET",
    headers: { "x-auth": token },
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
      // Log the latest sensor data to the console
      console.log("Latest sensor data:", data);

      // Check if the required data fields are present
      if (
        data.bpm === undefined ||
        data.spo2 === undefined ||
        data.device_id === undefined ||
        data.createdAt === undefined
      ) {
        // Display a message indicating no data is available
        $("#latestSensorData").html(`
          <div class="latest-data">
            <h2>Latest Sensor Data</h2>
            <p>No data available</p>
          </div>
        `);
      } else {
        // Display the sensor data in a formatted way
        $("#latestSensorData").html(`
          <div class="latest-data">
            <h2>Latest Sensor Data</h2>
            <p><strong>BPM:</strong> ${data.bpm}</p>
            <p><strong>SPO2:</strong> ${data.spo2}</p>
            <p><strong>Device ID:</strong> ${data.device_id}</p>
            <p><strong>Timestamp:</strong> ${new Date(
              data.createdAt
            ).toLocaleString()}</p>
          </div>
        `);
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      // Log the error to the console
      console.error("Error fetching latest sensor data:", errorThrown);
      // Display an alert indicating the failure
      alert("Failed to fetch latest sensor data. Please try again.");
    });
}

/**
 * Initializes the application by populating the device selection dropdown.
 * - If no devices are found, an alert is shown to the user.
 * - Adds an "All Devices" option to the dropdown if it doesn't already exist.
 * - Selects the first device in the dropdown if there are any devices available.
 */
function initializeApp() {
  const deviceSelect = $("#deviceSelect");
  const options = deviceSelect.find("option");

  if (options.length === 0) {
    // No devices found
    alert("No devices found for your account.");
    return;
  }

  // Add "All Devices" option if it doesn't exist
  if (options.filter('[value="all"]').length === 0) {
    deviceSelect.prepend(
      $("<option></option>").attr("value", "all").text("All Devices")
    );
  }

  // If there's at least one device, select the first one
  if (options.length > 0) {
    deviceSelect.val(options.first().val());
    // Optionally, auto-generate view for the first device
    // generateView();
  }
}

/**
 * Toggle visibility of date picker based on view type.
 */
$("#viewType").on("change", function () {
  const view = $(this).val();
  const datePicker = $("#datePickerContainer");
  if (view === "daily") {
    datePicker.show();
  } else {
    datePicker.hide();
  }
});

/**
 * Event listener for Generate View button.
 */
$("#generateView").on("click", function () {
  generateView();
});


/**
 * Generates the view based on the selected view type, device, and time range.
 * Validates the inputs and fetches sensor data accordingly.
 * 
 * @function generateView
 * @returns {void}
 * 
 * @description
 * This function performs the following steps:
 * 1. Retrieves the selected view type, device ID, start time, and end time from the DOM.
 * 2. Validates the device selection and time inputs.
 * 3. Parses the start and end times.
 * 4. Initializes the start and end times based on the view type (weekly or daily).
 * 5. Fetches sensor data from the server using an AJAX request.
 * 6. Displays the fetched data in the appropriate format (weekly summary or detailed daily view).
 * 7. Handles errors and displays alerts for invalid inputs or failed data fetches.
 * 8. Shows and hides a loading indicator during the data fetch process.
 * 
 * @example
 * // HTML elements required:
 * // <select id="viewType">, <select id="deviceSelect">, <input id="startTime">, <input id="endTime">, <input id="selectedDate">
 * 
 * // Call the function to generate the view
 * generateView();
 */
function generateView() {
  const viewType = $("#viewType").val();
  const selectedDeviceId = $("#deviceSelect").val();
  const startTimeInput = $("#startTime").val();
  const endTimeInput = $("#endTime").val();

  // Log the selected view type, device ID, start time, and end time to the console
  console.log("Selected View Type:", viewType);
  console.log("Selected Device ID:", selectedDeviceId);
  console.log("Start Time:", startTimeInput);
  console.log("End Time:", endTimeInput);

  // Validate device selection
  if (!selectedDeviceId) {
    alert("Please select a device.");
    return;
  }

  // Validate time inputs
  if (!startTimeInput || !endTimeInput) {
    alert("Please specify both start and end times.");
    return;
  }

  // Split and convert start and end time inputs to numbers
  const startTimeParts = startTimeInput.split(":").map(Number);
  const endTimeParts = endTimeInput.split(":").map(Number);

  // Check if the time format is valid
  if (startTimeParts.length !== 2 || endTimeParts.length !== 2) {
    alert("Invalid time format.");
    return;
  }

  // Initialize start and end times
  let startTime, endTime;

  // Set start and end times for weekly view
  if (viewType === "weekly") {
    endTime = new Date(); // Current time
    startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  } else if (viewType === "daily") {
    // Set start and end times for daily view
    const selectedDate = $("#selectedDate").val();
    if (!selectedDate) {
      alert("Please select a date for Detailed Daily View.");
      return;
    }
    const [year, month, day] = selectedDate.split("-").map(Number);
    startTime = new Date(
      year,
      month - 1,
      day,
      startTimeParts[0],
      startTimeParts[1],
      0
    );
    endTime = new Date(
      year,
      month - 1,
      day,
      endTimeParts[0],
      endTimeParts[1],
      59
    );

    // Validate the date and time
    if (isNaN(startTime) || isNaN(endTime)) {
      alert("Invalid date or time.");
      return;
    }

    // Ensure start time is before end time
    if (startTime >= endTime) {
      alert("Start time must be before end time.");
      return;
    }
  }

  // Log the start and end times in ISO format
  console.log("Start Time (ISO):", startTime.toISOString());
  console.log("End Time (ISO):", endTime.toISOString());

  // Determine the URL based on the selected device ID
  const url =
    selectedDeviceId === "all"
      ? "/sensor"
      : `/sensor?device_id=${selectedDeviceId}`;

  // Make an AJAX GET request to fetch sensor data
  $.ajax({
    url: url,
    method: "GET",
    headers: { "x-auth": token },
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
      // Log all sensor data to the console
      console.log("All sensor data:", data);

      // Check if the data is valid and not empty
      if (!Array.isArray(data) || data.length === 0) {
        alert("No data available for the selected time range.");
        $("#loadingIndicator").hide();
        return;
      }

      // Display the appropriate view based on the selected view type
      if (viewType === "weekly") {
        displayWeeklySummary(data);
        console.log("Weekly Summary Data:", data);
        // Display latest sensor data only for weekly view
        var latestData = data[data.length - 1];
        displayLatestSensorData(latestData);
      } else if (viewType === "daily") {
        displayDetailedDailyView(data, startTime, endTime);
      }

      // Hide loading indicator after processing
      $("#loadingIndicator").hide();
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      // Log the error to the console and display an alert
      console.error("Error fetching all sensor data:", errorThrown);
      alert("Failed to fetch all sensor data. Please try again.");
    });

  // Show loading indicator
  $("#loadingIndicator").show();
}

/**
 * Displays the Weekly Summary View.
 * Calculates and shows average, min, and max heart rate over the past 7 days.
 * @param {Array} data - Array of sensor data objects.
 */
function displayWeeklySummary(data) {
  // Filter heart rate data
  const heartRates = data
    .filter((entry) => typeof entry.bpm === "number")
    .map((entry) => entry.bpm);

  if (heartRates.length === 0) {
    alert("No valid heart rate data available.");
    // Hide Weekly Summary section
    $("#weeklySummary").hide();
    return;
  }

  // Calculate statistics
  const averageHR = calculateAverage(heartRates);
  const minHR = Math.min(...heartRates);
  const maxHR = Math.max(...heartRates);

  console.log(
    `Weekly Heart Rate - Avg: ${averageHR}, Min: ${minHR}, Max: ${maxHR}`
  );

  // Update summary in the DOM
  $("#avgHeartRate").text(averageHR);
  $("#minHeartRate").text(minHR);
  $("#maxHeartRate").text(maxHR);

  // Render Bar Chart
  const ctx = document.getElementById("weeklySummaryChart").getContext("2d");
  if (weeklySummaryChart) {
    weeklySummaryChart.destroy();
  }

  weeklySummaryChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Average BPM", "Minimum BPM", "Maximum BPM"],
      datasets: [
        {
          label: "Heart Rate (BPM)",
          data: [averageHR, minHR, maxHR],
          backgroundColor: [
            "rgba(75, 192, 192, 0.6)",
            "rgba(255, 99, 132, 0.6)",
            "rgba(255, 206, 86, 0.6)",
          ],
          borderColor: [
            "rgba(75, 192, 192, 1)",
            "rgba(255,99,132,1)",
            "rgba(255, 206, 86, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Weekly Heart Rate Summary",
        },
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "BPM",
          },
        },
      },
    },
  });

  // Show Weekly Summary and hide Detailed Daily Charts and Latest Data
  $("#weeklySummary").show();
  $("#dailyCharts").hide();
  $("#latestSensorData").hide();
}

/**
 * Displays the Detailed Daily View.
 * Plots heart rate and SpO2 readings on separate charts with min and max indicators.
 * @param {Array} data - Array of sensor data objects.
 * @param {Date} startTime - Start time of the data range.
 * @param {Date} endTime - End time of the data range.
 */
function displayDetailedDailyView(data, startTime, endTime) {
  console.log("Displaying Detailed Daily View");
  // Process heart rate data
  const heartRateData = data
    .filter((entry) => typeof entry.bpm === "number")
    .map((entry) => ({
      x: new Date(entry.createdAt),
      y: entry.bpm,
    }));

  // Process SpO2 data
  const spo2Data = data
    .filter((entry) => typeof entry.spo2 === "number")
    .map((entry) => ({
      x: new Date(entry.createdAt),
      y: entry.spo2,
    }));

  console.log("Processed Heart Rate Data:", heartRateData);
  console.log("Processed SpO2 Data:", spo2Data);

  // Check if there is data to plot
  if (heartRateData.length === 0 && spo2Data.length === 0) {
    alert("No valid heart rate or SpO₂ data available.");
    // Hide Detailed Daily Charts section
    $("#dailyCharts").hide();
    return;
  }

  // Calculate statistics for Heart Rate
  const bpmValues = heartRateData.map((entry) => entry.y);
  const avgBPM = calculateAverage(bpmValues);
  const minBPM = Math.min(...bpmValues);
  const maxBPM = Math.max(...bpmValues);

  // Calculate statistics for SpO2
  const spo2Values = spo2Data.map((entry) => entry.y);
  const avgSpO2 = calculateAverage(spo2Values);
  const minSpO2 = Math.min(...spo2Values);
  const maxSpO2 = Math.max(...spo2Values);

  console.log(`Heart Rate - Avg: ${avgBPM}, Min: ${minBPM}, Max: ${maxBPM}`);
  console.log(`SpO2 - Avg: ${avgSpO2}, Min: ${minSpO2}, Max: ${maxSpO2}`);

  // Prepare Heart Rate Chart
  const hrCtx = document.getElementById("heartRateChart").getContext("2d");
  if (heartRateChart) {
    heartRateChart.destroy();
  }

  heartRateChart = new Chart(hrCtx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Heart Rate (BPM)",
          data: heartRateData,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: true,
          tension: 0.1,
        },
        {
          label: "Minimum BPM",
          data: heartRateData.map((entry) => ({
            x: entry.x,
            y: minBPM,
          })),
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          borderDash: [5, 5],
          showLine: true,
          order: 3,
        },
        {
          label: "Maximum BPM",
          data: heartRateData.map((entry) => ({
            x: entry.x,
            y: maxBPM,
          })),
          borderColor: "rgba(255, 206, 86, 1)",
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          borderDash: [5, 5],
          showLine: true,
          order: 3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Heart Rate Over Time",
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
        legend: {
          display: true,
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "hour",
            displayFormats: {
              hour: "HH:mm",
            },
            tooltipFormat: "PPpp",
          },
          title: {
            display: true,
            text: "Time of Day",
          },
          min: startTime,
          max: endTime,
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: "Heart Rate (BPM)",
          },
          min: 40, // Set minimum value to 40
          max: 200, // Set maximum value to 200
        },
      },
    },
  });

  // Prepare SpO2 Chart
  const spo2Ctx = document.getElementById("spo2Chart").getContext("2d");
  if (spo2Chart) {
    spo2Chart.destroy();
  }

  spo2Chart = new Chart(spo2Ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "SpO₂ Level (%)",
          data: spo2Data,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          fill: true,
          tension: 0.1,
        },
        {
          label: "Minimum SpO₂",
          data: spo2Data.map((entry) => ({ x: entry.x, y: minSpO2 })),
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          borderDash: [5, 5],
          showLine: true,
          order: 2,
        },
        {
          label: "Maximum SpO₂",
          data: spo2Data.map((entry) => ({ x: entry.x, y: maxSpO2 })),
          borderColor: "rgba(255, 206, 86, 1)",
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          borderDash: [5, 5],
          showLine: true,
          order: 3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "SpO₂ Levels Over Time",
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
        legend: {
          display: true,
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "hour",
            displayFormats: {
              hour: "HH:mm",
            },
            tooltipFormat: "PPpp",
          },
          title: {
            display: true,
            text: "Time of Day",
          },
          min: startTime,
          max: endTime,
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: "SpO₂ Level (%)",
          },
          min: 70, // Set minimum value to 80
          max: 105, // Set maximum value to 100
        },
      },
    },
  });

  console.log("Heart Rate Chart:", heartRateChart);
  console.log("SpO2 Chart:", spo2Chart);

  // Show Detailed Daily Charts and hide Weekly Summary and Latest Data
  $("#dailyCharts").show();
  $("#weeklySummary").hide();
  $("#latestSensorData").hide();
}

/**
 * Calculates the average of an array of numbers.
 * @param {number[]} numbers - Array of numerical values.
 * @returns {number} - The average value rounded to two decimal places.
 */
function calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return parseFloat((sum / numbers.length).toFixed(2));
}

/**
 * Displays the latest sensor data.
 * @param {Object} data - Latest sensor data object.
 */
function displayLatestSensorData(data) {
  // Show Latest Sensor Data
  $("#latestSensorData").show();
}

$(function () {
  $("#btnLogOut").click(logout);
});

function logout() {
  localStorage.removeItem("token");
  window.location.replace("index.html");
}
