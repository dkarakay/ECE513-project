//Additional JavaScript for Chart Rendering and UI Handling -->
let heartRateChart = null;
let spo2Chart = null;

const token = window.localStorage.getItem("physicianToken");
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("patient_id");

$(document).ready(function () {
  // Ensure the token is stored in localStorage
  if (!token) {
    alert("You are not logged in!");
    window.location.replace("login.html");
    return;
  }

  // Fetch the user's ID from thhe query string

  const deviceSelect = $("#deviceSelect");

  // Fetch the user's devices and populate the dropdown
  $.ajax({
    url: `/users/me?userId=${userId}`,
    method: "GET",
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
      $("#patientEmail").text(data.email); // Display the patient's email
      populateDeviceDropdown(data.devices, userId);
      fetchLatestSensorData(userId);
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

function populateDeviceDropdown(devices, userId) {
  const deviceSelect = $("#deviceSelect");
  deviceSelect.empty();
  if (devices.length > 1) {
    deviceSelect.append(
      $("<option></option>").attr("value", "all").text("All Devices")
    );
  }
  devices.forEach((device) => {
    deviceSelect.append(
      $("<option></option>")
        .attr("value", device.device_id)
        .text(device.device_id)
    );
  });
  deviceSelect.change(function () {
    fetchLatestSensorData(userId);
  });
}

function fetchLatestSensorData(userId) {
  const selectedDeviceId = $("#deviceSelect").val();
  var url =
    selectedDeviceId === "all"
      ? `/sensor/latest?userId=${userId}`
      : `/sensor/latest?device_id=${selectedDeviceId}&userId=${userId}`;

  console.log("Fetching latest sensor data from:", url);
  $.ajax({
    url: url,
    method: "GET",
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
      console.log("Latest sensor data:", data);
      if (
        data.bpm === undefined ||
        data.spo2 === undefined ||
        data.device_id === undefined ||
        data.createdAt === undefined
      ) {
        $("#latestSensorData").html(`
          <div class="latest-data">
            <h2>Latest Sensor Data</h2>
            <p>No data available</p>
          </div>
        `);
      } else {
        // Display the sensor data in a fancy way
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
      console.log("jqXHR:", jqXHR);
      console.error("Error fetching latest sensor data:", errorThrown);
      alert("Failed to fetch latest sensor data. Please try again.");
    });
}

/**
 * Initialize the application once devices are loaded.
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
 * Generates the selected view by fetching data and rendering charts.
 */
function generateView() {
  const viewType = $("#viewType").val();
  const selectedDeviceId = $("#deviceSelect").val();
  const startTimeInput = $("#startTime").val();
  const endTimeInput = $("#endTime").val();

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

  const startTimeParts = startTimeInput.split(":").map(Number);
  const endTimeParts = endTimeInput.split(":").map(Number);

  if (startTimeParts.length !== 2 || endTimeParts.length !== 2) {
    alert("Invalid time format.");
    return;
  }

  // Initialize start and end times
  let startTime, endTime;

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
    startTimeParts[1]
  );
  endTime = new Date(year, month - 1, day, endTimeParts[0], endTimeParts[1]);

  if (isNaN(startTime) || isNaN(endTime)) {
    alert("Invalid date or time.");
    return;
  }

  if (startTime >= endTime) {
    alert("Start time must be before end time.");
    return;
  }

  console.log("Start Time (ISO):", startTime.toISOString());
  console.log("End Time (ISO):", endTime.toISOString());

  const url =
    selectedDeviceId === "all"
      ? `/sensor?userId=${userId}`
      : `/sensor?device_id=${selectedDeviceId}&userId=${userId}`;
  console.log("Fetching sensor data from:", url);
  $.ajax({
    url: url,
    method: "GET",
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
      console.log("All sensor data:", data);
      if (!Array.isArray(data) || data.length === 0) {
        alert("No data available for the selected time range.");
        $("#loadingIndicator").hide();
        return;
      }

      displayDetailedDailyView(data, startTime, endTime);

      // Hide loading indicator after processing
      $("#loadingIndicator").hide();
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.error("Error fetching all sensor data:", errorThrown);
      alert("Failed to fetch all sensor data. Please try again.");
    });

  // Show loading indicator
  $("#loadingIndicator").show();
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
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          borderDash: [5, 5],
          showLine: true,
          order: 2,
        },
        {
          label: "Maximum BPM",
          data: heartRateData.map((entry) => ({
            x: entry.x,
            y: maxBPM,
          })),
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
          beginAtZero: true,
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
          beginAtZero: true,
        },
      },
    },
  });

  console.log("Heart Rate Chart:", heartRateChart);
  console.log("SpO2 Chart:", spo2Chart);

  // Show Detailed Daily Charts and hide Weekly Summary and Latest Data
  $("#dailyCharts").show();
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
