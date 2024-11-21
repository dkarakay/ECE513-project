$(document).ready(function () {
  // Ensure the token is stored in localStorage
  const token = window.localStorage.getItem("token");
  if (!token) {
    alert("You are not logged in!");
    window.location.replace("login.html");
    return;
  }

  // Send the request to /sensor/latest with the x-auth header
  $.ajax({
    url: "/sensor/latest",
    method: "GET",
    headers: { "x-auth": token },
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
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
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.error("Error fetching latest sensor data:", errorThrown);
      alert("Failed to fetch latest sensor data. Please try again.");
    });

  // Send the request to /sensor with the x-auth header
  $.ajax({
    url: "/sensor",
    method: "GET",
    headers: { "x-auth": token },
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
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
});
