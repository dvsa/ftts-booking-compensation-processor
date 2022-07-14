# Booking Compensation Processor

This function helps to identify any bookings that need to be compensated due to a specific fault that affects multiple bookings. Any bookings that need to be compensated get flagged for follow up and then get dealt with accordingly.

## Functions

All function definitions are housed under their own folder in the root of this project. As an example, see the `bookingCompensationProcessor` folder. The code that this function follows can be found in `src/bookingCompensationProcessor`.

## Creating the local.settings.json

For this component, we use a `local.settings.json` file to store all environment variables to run the project locally.

You can create this file by running `npm run copy-config`

Locally `CRM_CLIENT_ID` and `CRM_CLIENT_SECRET` are required for CRM authentication. `USER_ASSIGNED_ENTITY_CLIENT_ID` is not needed (only used deployed).

## Building the project

Install node modules

```bash
npm install
```

Run the build process

```bash
npm run build
```

## Running the project locally

- Run `npm run copy-config` and fill in the missing configuration in your local.settings.json. Set connection strings as below, pointing to deployed/local storage.
- Run `npm start`. Running this start script triggers the `prestart` script which will automatically run the build process. The function will start on port `7071` by default. This can be configured within the `package.json` directly via the script.
- The function will run as per the cron schedule specified. Or you can invoke the function manually via HTTP as explained below.

### Pointing to deployed storage

Set `AzureWebJobsStorage` and `BCP_FILE_STORAGE` as per the connection strings in the deployed configuration.

### Pointing to locally emulated storage via Azurite

Set `AzureWebJobsStorage` and `BCP_FILE_STORAGE` to `UseDevelopmentStorage=true`. Install Azurite eg. via the VSCode extension and then Start Blob Service.

### Debugging

Debug locally using the `.vscode/launch.json` 'Attach to Node Functions' config. Note the function will run on the default port `7071`.

## Tests

All tests can be found in the `tests` folder.

To run all tests:

```bash
npm test
```

To run the tests in watch mode:

```bash
npm run test:watch
```

To run test coverage:

```bash
npm run test:coverage
```

See the generated coverage report in the `coverage` folder created after running the tests.

### Integration tests

There are integration tests for both the CRM client and the BCP function itself.

Ensure the .env file is in place with the correct environment variable values, an example can be found in .env.example

Running against local BCP instance (with Azurite) - set the connection strings to `UseDevelopmentStorage=true` accordingly. Function host and master key are not needed (defaults to localhost).

Running against deployed BCP instance - set the connection strings and function host (eg. <https://dsuksdvbcpfnc003.azurewebsites.net>) per the deployed environment. Also set the function master key - you can retrieve this via the az-cli: `az functionapp keys list -n <functionAppName> -g <resourceGroupName> --query masterKey -o tsv`.

To run the integration tests:

```bash
npm run test:int // All integration tests
npm run test:int-crm // CRM integration tests
npm run test:int-bcp // BCP function integration tests
```

## Linter

We use custom lint rules with `eslint` to enforce coding style for this project.

To run the linter:

```bash
npm run lint
```

To run the lint and fix any issues that can be resolved automatically:

```bash
npm run lint:fix
```

## Invoking timer triggers manually

If you need to invoke a timer trigger for testing purposes but don't want to wait for the duration of the cron timer, you can use an Azure admin
endpoint.

- In Postman, make a `POST` request to the endpoint `/admin/functions/<your-function-name>`.
- Add the following to the body of the request:

```json
{
    "input": "test"
}
```

- If you are invoking the trigger to a deployed API on an environment, you need to add the `x-functions-key` header
using the master key from the function app. More information on this can be found [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-manually-run-non-http).

- Send the request to invoke the timer trigger manually.

## Function disabled

Note in all envs other than PP and PR, the function is disabled by default when you deploy. This is to stop the function automatically running and processing bookings unintentionally. To enable the function, set the `AzureWebJobs.booking-compensation-processor.Disabled` env var to false. The default cron schedule is every 30 mins.

## Function timeout

On Azure consumption plan the function will timeout after up to 10 minutes of execution (configurable via `functionTimeout` setting). To prevent destructive operations (such as cancelling bookings) starting before they can be guaranteed to be completed, a timeout check is implemented to make sure there is enough time left before the function timeout. Processing will be stopped (via a thrown exception) if:

```javascript
functionElapsedTime >= (functionTimeout - functionTimeoutBuffer)
```

The `functionTimeoutBuffer` can be adjusted via the FUNCTION_TIMEOUT_BUFFER_SECONDS env var.
