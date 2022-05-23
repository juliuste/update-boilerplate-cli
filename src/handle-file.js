import chalk from 'chalk'
import gitDiff from 'git-diff'
import { loadJsonFile as loadJSON } from 'load-json-file'
import { writeJsonFile as writeJSON } from 'write-json-file'
import get from 'lodash/get.js'
import isEqual from 'lodash/isEqual.js'
import fs from 'fs'
import path from 'path'
import { diff as jsonDiff } from 'just-diff'
import { diffApply as jsonDiffApply } from 'just-diff-apply'
import { isMatch } from 'matcher'
import { YesNoPrompt, YesNoPromptWithTemporaryText } from './prompt.js'

const clone = (x) => JSON.parse(JSON.stringify(x))

const promptYesNo = (config) => (new YesNoPrompt(config).run())
const promptYesNoWithTemporaryText = (config) => (new YesNoPromptWithTemporaryText(config).run())

export const createHandleNormalFileInBoth = (promptFn, fsReadFileFn, fsWriteFileFn) => async (file, confirmAll = false) => {
	const [boilerplateContent, cwdContent] = await Promise.all([
		fsReadFileFn(file.boilerplatePath, 'utf-8'),
		fsReadFileFn(file.cwdPath, 'utf-8'),
	])

	const diff = gitDiff(cwdContent, boilerplateContent, { color: true })
	if (!diff) return console.log(`${chalk.underline.bold(file.file)}: Already up to date.`)

	const shouldReplace = confirmAll || await promptFn({
		message: `${chalk.underline.bold(file.file)}: Already exists in the current project. ${chalk.italic('Replace old file (see diff below)')}?`,
		name: 'shouldReplace',
		initial: false,
		temporaryText: diff,
	})
	if (!shouldReplace) return
	await fsWriteFileFn(file.cwdPath, boilerplateContent, { encoding: 'utf-8' })
}
export const handleNormalFileInBoth = createHandleNormalFileInBoth(promptYesNoWithTemporaryText, fs.promises.readFile, fs.promises.writeFile)

export const createHandleJsonFileInBoth = (promptFn, loadJSONFn, writeJSONFn) => async (file, excludedPackageAttributes, confirmAll = false) => {
	const [boilerplateContent, cwdContent] = await Promise.all([
		loadJSONFn(file.boilerplatePath),
		loadJSONFn(file.cwdPath),
	])

	const isPackageJson = path.basename(file.file) === 'package.json'

	const finalVersion = clone(cwdContent)
	const diff = jsonDiff(finalVersion, boilerplateContent).filter(({ path }) => !isPackageJson || !isMatch(path.join('/'), excludedPackageAttributes))
	if (diff.length === 0) return console.log(`${chalk.underline.bold(file.file)}: Already up to date.`)

	for (const operation of diff) {
		const path = chalk.bold(`${chalk.underline(file.file)} > ${chalk.bgBlue(operation.path.join(' > '))}`)

		let message, before, after
		if (operation.op === 'add') {
			message = `${path}: Key does not exist in the current project. ${chalk.italic('Copy from boilerplate (see diff below)')}?`
			before = '\n'
			after = JSON.stringify(get(boilerplateContent, operation.path), null, 4) + '\n'
		} else if (operation.op === 'remove') {
			message = `${path}: Key exists in the current project, but not in boilerplate. ${chalk.italic('Remove key (see diff below)')}?`
			before = JSON.stringify(get(cwdContent, operation.path), null, 4) + '\n'
			after = '(removed)\n'
		} else if (operation.op === 'replace') {
			message = `${path}: Key differs from boilerplace. ${chalk.italic('Replace with boilerplate value (see diff below)')}?`
			before = JSON.stringify(get(cwdContent, operation.path), null, 4) + '\n'
			after = JSON.stringify(get(boilerplateContent, operation.path), null, 4) + '\n'
		} else { throw new Error(`Unexpected JSON operation: ${operation.op}. Please contact the package maintainer.`) }

		const shouldApply = confirmAll || await promptFn({
			message,
			name: 'shouldApply',
			initial: false,
			temporaryText: gitDiff(before, after, { color: true }),
		})
		if (shouldApply) jsonDiffApply(finalVersion, [operation])
	}
	// todo: confirm again?
	if (!isEqual(finalVersion, cwdContent)) await writeJSONFn(file.cwdPath, finalVersion)
}
export const handleJsonFileInBoth = createHandleJsonFileInBoth(promptYesNoWithTemporaryText, loadJSON, writeJSON)

export const createHandleFileOnlyInBoilerplate = (promptFn, fsPromiseMkdirFn, fsPromiseCopyFileFn) => async (file, confirmAll = false) => {
	const shouldCopy = confirmAll || await promptFn({
		message: `${chalk.underline.bold(file.file)}: Does not yet exist in the current project. ${chalk.italic('Copy from boilerplate')}?`,
		name: 'shouldCopy',
		initial: false,
	})
	if (!shouldCopy) return
	await fsPromiseMkdirFn(path.dirname(file.cwdPath), { recursive: true })
	await fsPromiseCopyFileFn(file.boilerplatePath, file.cwdPath)
}
export const handleFileOnlyInBoilerplate = createHandleFileOnlyInBoilerplate(promptYesNo, fs.promises.mkdir, fs.promises.copyFile)

export const createHandleFileOnlyInCwd = (promptFn, fsPromiseRmFn) => async (file, confirmAll = false) => {
	const shouldRemove = confirmAll || await promptFn({
		message: `${chalk.underline.bold(file.file)}: Exists in the current project, but not in boilerplate. ${chalk.italic('Remove file')}?`,
		name: 'shouldRemove',
		initial: false,
	})
	if (!shouldRemove) return
	await fsPromiseRmFn(file.cwdPath)
	// todo: ask to remove parent directory if empty after deleting the file?
}
export const handleFileOnlyInCwd = createHandleFileOnlyInCwd(promptYesNo, fs.promises.rm)
