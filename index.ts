#! /usr/bin/env node
require('dotenv').config()
import { Command } from 'commander'
import { publish } from './publish'
import { init } from './init'
const program = new Command()

init(program)
publish(program)

program.parse()
