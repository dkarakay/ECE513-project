$(document).ready(function () {
  // Ensure the token is stored in localStorage
  const token = window.localStorage.getItem("token");
  if (!token) {
    alert("You are not logged in!");
    window.location.replace("login.html");
    return;
  }

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
      fetchAllSensorData();
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.error("Error fetching user devices:", errorThrown);
      alert("Failed to fetch user devices. Please try again.");
    });

  function populateDeviceDropdown(devices) {
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
      fetchLatestSensorData();
      fetchAllSensorData();
    });
  }

  function fetchLatestSensorData() {
    const selectedDeviceId = $("#deviceSelect").val();
    const url =
      selectedDeviceId === "all"
        ? "/sensor/latest"
        : `/sensor/latest?device_id=${selectedDeviceId}`;
    $.ajax({
      url: url,
      method: "GET",
      headers: { "x-auth": token },
      dataType: "json",
    })
      .done(function (data, textStatus, jqXHR) {
        console.log("Latest sensor data:", data);
        if (
          data.bpm === undefined ||
          data.spo2 === undefined ||
          data.device_id === undefined ||
          data.created_at === undefined
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
                data.created_at
              ).toLocaleString()}</p>
            </div>
          `);
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error("Error fetching latest sensor data:", errorThrown);
        alert("Failed to fetch latest sensor data. Please try again.");
      });
  }

  function fetchAllSensorData() {
    const selectedDeviceId = $("#deviceSelect").val();
    const url =
      selectedDeviceId === "all"
        ? "/sensor"
        : `/sensor?device_id=${selectedDeviceId}`;
    $.ajax({
      url: url,
      method: "GET",
      headers: { "x-auth": token },
      dataType: "json",
    })
      .done(function (data, textStatus, jqXHR) {
        console.log("All sensor data:", data);
        // Display all sensor data
        $("#allSensorData").html(`
          <h2>All Sensor Data</h2>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        `);
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error("Error fetching all sensor data:", errorThrown);
        alert("Failed to fetch all sensor data. Please try again.");
      });
  }
});
