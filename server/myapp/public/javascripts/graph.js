//Additional JavaScript for Chart Rendering and UI Handling -->
let heartRateChart = null;
let spo2Chart = null;
let weeklySummaryChart = null;

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

  // Remove "All Devices" option if it exists
  options.filter('[value="all"]').remove();

  // If there's at least one device, select the first one
  if (options.length > 0) {
    deviceSelect.val(options.first().val());
    // Optionally, auto-generate view for the first device
    // generateView();
  }
}

/**
 * Listen for device dropdown population using MutationObserver.
 */
$(document).ready(function () {
  const deviceSelect = $("#deviceSelect");

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
});

$(document).ready(function () {
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

  if (viewType === "weekly") {
    endTime = new Date(); // Current time
    startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  } else if (viewType === "daily") {
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
  }

  console.log("Start Time (ISO):", startTime.toISOString());
  console.log("End Time (ISO):", endTime.toISOString());

  // Construct API URL based on selected device and time range
  const baseUrl =
    "http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor";
  let apiUrl;
  if (selectedDeviceId === "all") {
    apiUrl = `${baseUrl}/all?start=${startTime.toISOString()}&end=${endTime.toISOString()}`;
  } else {
    apiUrl = `${baseUrl}?device_id=${selectedDeviceId}&start=${startTime.toISOString()}&end=${endTime.toISOString()}`;
  }

  console.log("Fetching data from:", apiUrl);

  // Show loading indicator
  $("#loadingIndicator").show();

  // Fetch data from API with authentication token
  const token = localStorage.getItem("token"); // assuming token is stored here
  if (!token) {
    alert("Authentication token not found. Please log in.");
    window.location.href = "login.html";
    return;
  }

  fetch(apiUrl, {
    method: "GET",
    headers: {
      "x-auth": token,
    },
  })
    .then((response) => {
      console.log("Response Status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Data fetched:", data);
      if (!Array.isArray(data) || data.length === 0) {
        alert("No data available for the selected time range.");
        $("#loadingIndicator").hide();
        return;
      }

      if (viewType === "weekly") {
        displayWeeklySummary(data);
        // Display latest sensor data only for weekly view
        displayLatestSensorData(data[0]); // Assuming the first entry is the latest
      } else if (viewType === "daily") {
        displayDetailedDailyView(data, startTime, endTime);
        // Optionally, you can decide whether to show latest data for daily view
        // If so, modify displayLatestSensorData to not hide dailyCharts
        // displayLatestSensorData(data[0]);
      }

      // Hide loading indicator after processing
      $("#loadingIndicator").hide();
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      alert(`Failed to fetch data: ${error.message}`);
      // Hide loading indicator on error
      $("#loadingIndicator").hide();
    });
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
      x: new Date(entry.created_at),
      y: entry.bpm,
    }));

  // Process SpO2 data
  const spo2Data = data
    .filter((entry) => typeof entry.spo2 === "number")
    .map((entry) => ({
      x: new Date(entry.created_at),
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
  if (
    data.bpm === undefined ||
    data.spo2 === undefined ||
    data.device_id === undefined ||
    data.created_at === undefined
  ) {
    $("#latestDataContent").html(`
                    <p>No data available</p>
                `);
  } else {
    // Display the sensor data in a styled format
    $("#latestDataContent").html(`
                    <p><strong>BPM:</strong> ${data.bpm}</p>
                    <p><strong>SPO₂:</strong> ${data.spo2}</p>
                    <p><strong>Device ID:</strong> ${data.device_id}</p>
                    <p><strong>Timestamp:</strong> ${new Date(
                      data.created_at
                    ).toLocaleString()}</p>
                `);
  }

  // Show Latest Sensor Data
  $("#latestSensorData").show();

  // Hide Weekly Summary if visible
  // $('#weeklySummary').hide();

  // Do NOT hide Daily Charts
  // $('#dailyCharts').hide(); // Removed to prevent hiding charts
}
