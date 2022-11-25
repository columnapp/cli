## Hello :wave: from Column.app!

Welcome! This is repo contains the command line interface to create and publish columns for https://column.app

### Getting Started

A column is a plain javascript object that contains how the column would behave once it's mounted to a table on columns.app. Here are the steps to get things started:

- :checkered_flag:. Create a directory, name it whatever you want.
- :file_folder: Inside the newly created directory run `npx @columnapp/cli init` to bootstrap folder.
- :pencil2: Inside you will find `index.ts`, the javascript object exported there is what will be published. Currently, we only support typescript.
- :rocket: Once you are ready to publish, go to https://column.app/settings/columns to get a publish key.
- :star: run `npx @columnapp/cli publish <publish key>`, using the publish key you generated.

If you have any questions, feel free to email us @ hello@column.app :+1:
