$(function () {
  $("#btnLogOut").click(logout);
});

function logout() {
  localStorage.removeItem("physicianToken");
  window.location.replace("physician-login.html");
}

$(document).ready(function () {
  // Extract patient_id from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get("patient_id");

  if (!patientId) {
    alert("No patient specified.");
    window.location.href = "physician-dashboard.html";
    return;
  }

  const token = localStorage.getItem("physicianToken"); // Ensure token is stored upon login
  if (!token) {
    alert("Authentication token missing. Please log in.");
    window.location.href = "physician_login.html"; // Ensure this page exists
    return;
  }

  // Fetch patient summary data
  function fetchPatientSummary() {
    $.ajax({
      url: `/physicians/patient-summary/${patientId}`,
      method: "GET",
      headers: {
        "x-auth": token,
      },
      dataType: "json",
    })
      .done(function (data, textStatus, jqXHR) {
        populateSummary(data);
        renderChart(data);
        populateDeviceDropdown(data.devices);
        fetchMeasurementSettings(patientId);
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        if (jqXHR.status == 401) {
          alert("Unauthorized access. Please log in.");
          window.location.href = "physician-login.html";
        } else {
          alert("Failed to fetch patient summary data.");
        }
      });
  }

  // Populate summary data in the DOM
  function populateSummary(data) {
    $("#patientName").text(data.name);
    $("#avgHeartRate").text(data.avg_hr);
    $("#minHeartRate").text(data.min_hr);
    $("#maxHeartRate").text(data.max_hr);
  }

  // Render the summary chart
  function renderChart(data) {
    const ctx = document.getElementById("weeklySummaryChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Average BPM", "Minimum BPM", "Maximum BPM"],
        datasets: [
          {
            label: "Heart Rate (BPM)",
            data: [data.avg_hr, data.min_hr, data.max_hr],
            backgroundColor: [
              "rgba(255, 99, 132, 0.6)",
              "rgba(54, 162, 235, 0.6)",
              "rgba(255, 206, 86, 0.6)",
            ],
            borderColor: [
              "rgba(255,99,132,1)",
              "rgba(54, 162, 235, 1)",
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
            text: "7-Day Heart Rate Summary",
          },
          legend: {
            display: false,
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
  }

  function populateDeviceDropdown(devices) {
    const deviceSelect = $("#deviceSelect");
    deviceSelect.empty();
    devices.forEach((device) => {
      deviceSelect.append(
        $("<option></option>").attr("value", device).text(device)
      );
    });
  }

  function fetchMeasurementSettings(userId) {
    const selectedDeviceId = $("#deviceSelect").val();
    $.ajax({
      url: `/users/measurement-settings/${selectedDeviceId}?userId=${userId}`,
      method: "GET",
      dataType: "json",
    })
      .done(function (data) {
        console.log("Measurement interval:", data.measurementInterval);
        $("#measurementInterval").val(data.measurementInterval);
      })
      .fail(function (jqXHR) {
        console.error(
          "Failed to fetch measurement settings: " + jqXHR.responseText
        );
      });
  }

  function updateMeasurementSettings(userId) {
    const selectedDeviceId = $("#deviceSelect").val();
    const measurementInterval = $("#measurementInterval").val();

    if (!measurementInterval) {
      window.alert("Measurement interval is required.");
      return;
    }

    $.ajax({
      url: `/users/update-measurement-settings`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        userId: userId,
        device_id: selectedDeviceId,
        measurementInterval,
      }),
      dataType: "json",
    })
      .done(function (data) {
        console.log("AJAX request succeeded:", data);
        $("#updateFeedback").html(
          `<div class="alert alert-success">Measurement frequency updated successfully.</div>`
        );
      })
      .fail(function (jqXHR) {
        console.log("AJAX request failed:", jqXHR.responseText);
        $("#updateFeedback").html(
          `<div class="alert alert-danger">Failed to update frequency: ${jqXHR.responseText}</div>`
        );
      });
  }

  $("#updateFrequency").click(updateMeasurementSettings.bind(null, patientId));

  // Initialize
  fetchPatientSummary();
});
