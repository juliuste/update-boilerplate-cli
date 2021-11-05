#!/usr/bin/env node
import chalk from 'chalk'
import { globby } from 'globby'
import meow from 'meow'
import path from 'path'
import { handleJsonFileInBoth, handleNormalFileInBoth, handleFileOnlyInBoilerplate, handleFileOnlyInCwd } from './handle-file.js'
import { buildFileList, defaultJsonGlobs, defaultPatterns, helpMessage, splitFileList } from './util.js'

const cli = meow(helpMessage, {
	importMeta: import.meta,
	flags: {
		includePattern: {
			type: 'string',
			alias: 'i',
			isMultiple: true,
		},
		disableDefaultPatterns: {
			type: 'boolean',
			alias: 'd',
		},
		json: {
			type: 'string',
			alias: 'j',
			isMultiple: true,
		},
		confirmAll: {
			type: 'boolean',
			alias: 'y',
		},
	},
})

const main = async () => {
	const relativeBoilerplatePath = cli.input[0]
	if (!relativeBoilerplatePath || cli.input.length > 1) return cli.showHelp()

	const patterns = [
		...(cli.flags.disableDefaultPatterns ? [] : defaultPatterns),
		...cli.flags.includePattern,
	]
	const jsonGlobs = cli.flags.json.length !== 0 ? cli.flags.json : defaultJsonGlobs

	const boilerplatePath = path.resolve(relativeBoilerplatePath)
	const boilerplateFiles = await globby(patterns, { cwd: boilerplatePath })

	const cwdPath = path.resolve()
	const cwdFiles = await globby(patterns)

	const fileList = buildFileList(boilerplatePath, boilerplateFiles, cwdPath, cwdFiles, jsonGlobs)
	const { normalInBoth, jsonInBoth, onlyInBoilerplate, onlyInCwd } = splitFileList(fileList)

	if (!cli.flags.confirmAll) console.log(chalk.yellow('Warning: This tool allows you to overwrite part of your current working directory. Please make sure that all files are checked in to version control before proceeding.'))

	for (const file of onlyInBoilerplate) { await handleFileOnlyInBoilerplate(file, cli.flags.confirmAll) }
	for (const file of normalInBoth) { await handleNormalFileInBoth(file, cli.flags.confirmAll) }
	for (const file of jsonInBoth) { await handleJsonFileInBoth(file, cli.flags.confirmAll) }
	for (const file of onlyInCwd) { await handleFileOnlyInCwd(file, cli.flags.confirmAll) }
}

main()
	.catch(error => {
		if (!error.message) console.error(chalk.red('Unexpected error, aborting.'))
		else console.error(`${chalk.red('Unexpected error, aborting:')} ${error.message}`)
		process.exit(1)
	})
