# ECE513 Project

## Server

`server/`

### Running Server

In order to run the server, run `sh run_server.sh`

In order to run the server continuously, run `sh run_server_nonstop.sh`

### Endpoints

| Method | Endpoint       | Description                                             | Example                                                                                                                                                                         |
| ------ | -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /sensor        | Add a new sensor reading.                               | `curl -X POST http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor -H "Content-Type: application/json" -d '{"device_id":"xxxx","data":{"bpm": 65, "spo2": 75}}'` |
| GET    | /sensor        | Get all sensor readings. Requires authentication.       | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor`                                                                                               |
| GET    | /sensor/all    | Get all sensor readings. Debug purposes.                | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor/all`                                                                                           |
| GET    | /sensor/latest | Get the latest sensor reading. Requires authentication. | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor/latest`                                                                                        |
| GET    | /reset         | Reset all sensor readings and user accounts.            | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/reset`                                                                                                |

## Particle

`particle/`
