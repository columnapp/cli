#! /usr/bin/env node
import { Command } from 'commander'
import colors from 'colors'
import { exit } from 'process'
import esbuild from 'esbuild'

type Options = {}
const program = new Command()
program
  .version('0.1.0')
  .argument('[key]', 'publish key, generate one at https://column.app/publish')
  //   .option('-p, --path', 'path to the column directory, where package.json is at the root')
  .action(async (key: string | null, options: Options) => {
    if (key == null) {
      console.error('Please provide a publish key, you can generate one at https://column.app/publish')
      exit(1)
    }
    console.log(colors.cyan('Verifying the column...'))
    console.log(colors.cyan('Packaging the column...'))
    await esbuild.build({
      entryPoints: ['column.ts'],
      allowOverwrite: true,
      bundle: true,
      minify: true,
      format: 'esm',
      keepNames: true,
      platform: 'browser',
      outfile: '_column.js',
    })
    console.log(colors.cyan('publishing the column...'))
  })

program.parse()
