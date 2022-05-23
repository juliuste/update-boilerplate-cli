import test from 'ava'
import { execa } from 'execa'
import fs from 'fs'
import { globby } from 'globby'
import path from 'path'
import pify from 'pify'
import tmp from 'tmp'
import { loadJsonFile as loadJSON } from 'load-json-file'
import { writeJsonFile as writeJSON } from 'write-json-file'

const tmpDirP = pify(tmp.dir)

test('works (with confirmAll option)', async t => {
	// generate some temporary files
	const tmpDirPath = await tmpDirP()
	const pathA = path.resolve(tmpDirPath, './a')
	const pathB = path.resolve(tmpDirPath, './b')
	const subPathA = path.resolve(pathA, './something')
	const subPathB = path.resolve(pathB, './else')
	await Promise.all([fs.promises.mkdir(subPathA, { recursive: true }), fs.promises.mkdir(subPathB, { recursive: true })])

	const fileA1 = path.resolve(pathA, 'test.txt')
	const fileB1 = path.resolve(pathB, 'test.txt')
	const fileA2 = path.resolve(subPathA, '.P')
	const fileB2 = path.resolve(subPathB, '.Q')
	const contentA12 = ['a', 'b', 'c', ''].join('\n')
	const contentB12 = ['c', 'd', 'e', 'f', ''].join('\n')

	const fileA3 = path.resolve(pathA, '.data.json')
	const fileB3 = path.resolve(pathB, '.data.json')
	const contentA3 = { p: { q: 'aaa' }, v: 123 }
	const contentB3 = { p: { r: 'aaa' }, v: '222' }
	await Promise.all([
		fs.promises.writeFile(fileA1, contentA12, { encoding: 'utf-8' }),
		fs.promises.writeFile(fileB1, contentB12, { encoding: 'utf-8' }),
		fs.promises.writeFile(fileA2, contentA12, { encoding: 'utf-8' }),
		fs.promises.writeFile(fileB2, contentB12, { encoding: 'utf-8' }),
		writeJSON(fileA3, contentA3),
		writeJSON(fileB3, contentB3),
	])

	const [filesABefore, filesBBefore] = await Promise.all([globby(['**', '**/.*'], { cwd: pathA }), globby(['**', '**/.*'], { cwd: pathB })])
	t.deepEqual(filesABefore.sort(), ['test.txt', 'something/.P', '.data.json'].sort())
	t.deepEqual(filesBBefore.sort(), ['test.txt', 'else/.Q', '.data.json'].sort())

	// run the cli
	const oldCwd = path.resolve()
	process.chdir(pathB)
	await execa(path.resolve(oldCwd, './src/cli.js'), ['--confirm-all', pathA])

	const [filesAAfter, filesBAfter] = await Promise.all([globby(['**', '**/.*'], { cwd: pathA }), globby(['**', '**/.*'], { cwd: pathB })])
	t.deepEqual(filesAAfter.sort(), ['test.txt', 'something/.P', '.data.json'].sort())
	t.deepEqual(filesBAfter.sort(), ['test.txt', 'something/.P', '.data.json'].sort())

	const [
		contentA1After,
		contentB1After,
		contentA2After,
		contentB2After,
		contentA3After,
		contentB3After,
	] = await Promise.all([
		fs.promises.readFile(fileA1, { encoding: 'utf-8' }),
		fs.promises.readFile(fileB1, { encoding: 'utf-8' }),
		fs.promises.readFile(fileA2, { encoding: 'utf-8' }),
		fs.promises.readFile(path.resolve(pathB, './something/.P'), { encoding: 'utf-8' }),
		loadJSON(fileA3),
		loadJSON(fileB3),
	])

	t.is(contentA1After, contentA12)
	t.is(contentB1After, contentA12)
	t.is(contentA2After, contentA12)
	t.is(contentB2After, contentA12)
	t.deepEqual(contentA3After, contentA3)
	t.deepEqual(contentB3After, contentA3)
})

test('parses arguments, shows version', async t => {
	const { stdout } = await execa('./src/cli.js', ['--version'])
	t.regex(stdout, /^\d+\.\d+\.\d+$/)
})
