// javascripts/physician_dashboard.js

$(document).ready(function () {
  // Fetch all patients for the physician
  function fetchPatients() {
    const token = localStorage.getItem("physicianToken");
    if (!token) {
      alert("Authentication token missing. Please log in.");
      window.location.href = "physician-login.html"; // Ensure this page exists
      return;
    }

    $.ajax({
      url: "/physicians/patients",
      method: "GET",
      headers: { "x-auth": token },
      dataType: "json",
    })
      .done(function (data, textStatus, jqXHR) {
        populatePatientsTable(data);
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error("Error fetching patients:", jqXHR.responseJSON);
        if (jqXHR.status == 401) {
          alert("Unauthorized access. Please log in.");
          window.location.href = "physician-login.html";
        } else {
          alert("Failed to fetch patients data.");
        }
      });
  }

  // Populate the patients table
  function populatePatientsTable(data) {
    const patients = data.patients;
    console.log("Data:", data);
    console.log("Patients data:", patients);
    const tbody = $("#patientsTable tbody");
    tbody.empty(); // Clear existing data

    patients.forEach((patient) => {
      const row = `<tr>
                <td>${patient.email}</td>
                <td>${patient.stats.averageBpm}</td>
                <td>${patient.stats.minBpm}</td>
                <td>${patient.stats.maxBpm}</td>
                <td>
                    <button class="btn btn-info view-summary" data-patient-id="${patient.id}">View Summary</button>
                    <button class="btn btn-secondary view-detail" data-patient-id="${patient.id}">View Detail</button>
                </td>
            </tr>`;
      tbody.append(row);
    });
  }

  // Event delegation for dynamically added buttons
  $("#patientsTable").on("click", ".view-summary", function () {
    const patientId = $(this).data("patient-id");
    window.location.href = `patient_summary.html?patient_id=${patientId}`;
  });

  $("#patientsTable").on("click", ".view-detail", function () {
    const patientId = $(this).data("patient-id");
    window.location.href = `patient_detail.html?patient_id=${patientId}`;
  });

  // Initialize
  fetchPatients();
});
