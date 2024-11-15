# ECE513 Project

## Server

`server/`

### Running Server

In order to run the server, run `sh run_server.sh`

### Endpoints

#### POST /sensor

Description: Add a new sensor reading.
Example:

```sh
curl -X POST http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor \
-H "Content-Type: application/json" \
-d '{"bpm": 65, "spo2": 75}
```

#### GET /sensor

Description: Get all sensor readings.
Example:

```sh
curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor
```

#### GET /sensor/latest

Description: Get the latest sensor reading.
Example:

```sh
curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor/latest
```

#### GET /reset

Description: Reset all sensor readings.
Example:

```sh
curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/reset
```

## Particle

`particle/`
