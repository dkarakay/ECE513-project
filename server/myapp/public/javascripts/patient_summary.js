// javascripts/patient_summary.js

$(document).ready(function () {
    // Extract patient_id from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patient_id');

    if (!patientId) {
        alert("No patient specified.");
        window.location.href = "physician_dashboard.html";
        return;
    }

    const token = localStorage.getItem('physicianToken'); // Ensure token is stored upon login
    if (!token) {
        alert("Authentication token missing. Please log in.");
        window.location.href = "physician_login.html"; // Ensure this page exists
        return;
    }

    // Fetch patient summary data
    function fetchPatientSummary() {
        $.ajax({
            url: `/physicians/patients/${patientId}/summary`,
            method: "GET",
            headers: {
                'Authorization': `Bearer ${token}`
            },
            dataType: "json",
        })
        .done(function (data, textStatus, jqXHR) {
            populateSummary(data);
            renderChart(data.chartData);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 401) {
                alert("Unauthorized access. Please log in.");
                window.location.href = "physician_login.html";
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
        $("#measurementFrequency").val(data.measurement_frequency);
    }

    // Render the summary chart
    function renderChart(chartData) {
        const ctx = document.getElementById('weeklySummaryChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Average BPM', 'Minimum BPM', 'Maximum BPM'],
                datasets: [{
                    label: 'Heart Rate (BPM)',
                    data: [chartData.avg_hr, chartData.min_hr, chartData.max_hr],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '7-Day Heart Rate Summary'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'BPM'
                        }
                    }
                }
            }
        });
    }

    // Update measurement frequency
    $("#updateFrequency").click(function () {
        const frequency = $("#measurementFrequency").val();
        if (frequency < 1) {
            alert("Frequency must be at least 1 minute.");
            return;
        }

        $.ajax({
            url: `/physicians/patients/${patientId}/frequency`,
            method: "PUT",
            headers: {
                'Authorization': `Bearer ${token}`
            },
            contentType: "application/json",
            data: JSON.stringify({ frequency: frequency }),
            dataType: "json",
        })
        .done(function (data, textStatus, jqXHR) {
            $("#updateFeedback").html(`<div class="alert alert-success">Measurement frequency updated successfully.</div>`);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            $("#updateFeedback").html(`<div class="alert alert-danger">Failed to update frequency.</div>`);
        });
    });

    // Initialize
    fetchPatientSummary();
});
