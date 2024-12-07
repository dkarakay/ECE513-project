// javascripts/patient_detail.js

$(document).ready(function () {
    // Extract patient_id and date from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patient_id');
    const date = urlParams.get('date') || new Date().toISOString().split('T')[0];

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

    // Fetch patient detailed daily data
    function fetchPatientDetail() {
        $.ajax({
            url: `/physicians/patients/${patientId}/daily`,
            method: "GET",
            headers: {
                'Authorization': `Bearer ${token}`
            },
            data: { date: date }, // Backend should handle date parameter
            dataType: "json",
        })
        .done(function (data, textStatus, jqXHR) {
            populateDetail(data);
            renderCharts(data.heart_rate_data, data.spo2_data, data);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 401) {
                alert("Unauthorized access. Please log in.");
                window.location.href = "physician_login.html";
            } else {
                alert("Failed to fetch patient detailed data.");
            }
        });
    }

    // Populate detail data in the DOM
    function populateDetail(data) {
        $("#patientName").text(data.name);
        $("#selectedDate").text(data.date);
    }

    // Render heart rate and SpO₂ charts
    function renderCharts(hrData, spo2Data, summaryData) {
        // Heart Rate Chart
        const hrCtx = document.getElementById('heartRateChart').getContext('2d');
        new Chart(hrCtx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Heart Rate (BPM)',
                        data: hrData.map(entry => ({ x: entry.timestamp, y: entry.bpm })),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'Minimum BPM',
                        data: hrData.map(entry => ({ x: entry.timestamp, y: summaryData.min_hr })),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        borderDash: [5, 5],
                        showLine: true,
                        order: 2
                    },
                    {
                        label: 'Maximum BPM',
                        data: hrData.map(entry => ({ x: entry.timestamp, y: summaryData.max_hr })),
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        borderDash: [5, 5],
                        showLine: true,
                        order: 3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Heart Rate Over Time'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        display: true
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                scales: {
                    x: { 
                        type: 'time',
                        time: { 
                            unit: 'hour',
                            displayFormats: {
                                hour: 'HH:mm'
                            },
                            tooltipFormat: 'PPpp'
                        },
                        title: {
                            display: true,
                            text: 'Time of Day'
                        }
                    },
                    y: { 
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Heart Rate (BPM)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });

        // SpO₂ Chart
        const spo2Ctx = document.getElementById('spo2Chart').getContext('2d');
        new Chart(spo2Ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'SpO₂ Level (%)',
                        data: spo2Data.map(entry => ({ x: entry.timestamp, y: entry.spo2 })),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'Minimum SpO₂',
                        data: spo2Data.map(entry => ({ x: entry.timestamp, y: summaryData.min_spo2 })),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        borderDash: [5, 5],
                        showLine: true,
                        order: 2
                    },
                    {
                        label: 'Maximum SpO₂',
                        data: spo2Data.map(entry => ({ x: entry.timestamp, y: summaryData.max_spo2 })),
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        borderDash: [5, 5],
                        showLine: true,
                        order: 3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'SpO₂ Levels Over Time'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        display: true
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                scales: {
                    x: { 
                        type: 'time',
                        time: { 
                            unit: 'hour',
                            displayFormats: {
                                hour: 'HH:mm'
                            },
                            tooltipFormat: 'PPpp'
                        },
                        title: {
                            display: true,
                            text: 'Time of Day'
                        }
                    },
                    y: { 
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'SpO₂ Level (%)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Initialize
    fetchPatientDetail();
});
