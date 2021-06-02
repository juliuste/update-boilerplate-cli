import test from 'ava'
import sinon from 'sinon'
import stripAnsi from 'strip-ansi'
import { createHandleFileOnlyInBoilerplate, createHandleFileOnlyInCwd, createHandleJsonFileInBoth, createHandleNormalFileInBoth } from './handle-file.js'

const removeAnsi = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? stripAnsi(v) : v]))

test('handleNormalFileInBoth', async t => {
	const contentA = ['a', 'b', 'c', ''].join('\n')
	const contentB = ['b', 'c', 'd', ''].join('\n')
	const pathA = '/home/a/src/1.txt'
	const pathB = '/home/b/src/1.txt'

	const readFileYes = sinon.fake(async (path) => (path.includes('/a/')) ? contentA : contentB)
	const writeFileYes = sinon.fake.resolves()
	const promptYes = sinon.fake.resolves(true)

	const expectedPrompt = {
		initial: false,
		name: 'shouldReplace',
		message: 'src/1.txt: Already exists in the current project. Replace old file (see diff below)?',
		temporaryText: ['@@ -1,3 +1,3 @@', '+a', ' b', ' c', '-d', ''].join('\n'),
	}

	// yes
	await createHandleNormalFileInBoth(promptYes, readFileYes, writeFileYes)({ file: 'src/1.txt', boilerplatePath: pathA, cwdPath: pathB, isInBoilerplate: true, isInCwd: true, isJson: false })
	t.is(readFileYes.callCount, 2)
	t.deepEqual(readFileYes.firstCall.args, [pathA, 'utf-8'])
	t.deepEqual(readFileYes.secondCall.args, [pathB, 'utf-8'])
	t.is(promptYes.callCount, 1)
	t.is(promptYes.firstCall.args.length, 1)
	t.deepEqual(removeAnsi(promptYes.firstCall.args[0]), expectedPrompt)
	t.is(writeFileYes.callCount, 1)
	t.deepEqual(writeFileYes.firstCall.args, [pathB, contentA, { encoding: 'utf-8' }])

	const readFileNo = sinon.fake(async (path) => (path.includes('/a/')) ? contentA : contentB)
	const writeFileNo = sinon.fake.resolves()
	const promptNo = sinon.fake.resolves(false)

	// no
	await createHandleNormalFileInBoth(promptNo, readFileNo, writeFileNo)({ file: 'src/1.txt', boilerplatePath: pathA, cwdPath: pathB, isInBoilerplate: true, isInCwd: true, isJson: false })
	t.is(readFileNo.callCount, 2)
	t.deepEqual(readFileNo.firstCall.args, [pathA, 'utf-8'])
	t.deepEqual(readFileNo.secondCall.args, [pathB, 'utf-8'])
	t.is(promptNo.callCount, 1)
	t.is(promptNo.firstCall.args.length, 1)
	t.deepEqual(removeAnsi(promptNo.firstCall.args[0]), expectedPrompt)
	t.is(writeFileNo.callCount, 0)
})

test('handleJsonFileInBoth', async t => {
	const contentA = { aaa: { bbb: '123' }, ddd: 4 }
	const contentB = { aaa: { ccc: '234' }, ddd: 5 }
	const pathA = '/home/a/test.json'
	const pathB = '/home/b/test.json'

	const readJSON = sinon.fake(async (path) => (path.includes('/a/')) ? contentA : contentB)
	const writeJSON = sinon.fake.resolves()
	const prompt = sinon.fake(async (config) => !config.message.includes('ddd'))

	await createHandleJsonFileInBoth(prompt, readJSON, writeJSON)({ file: 'test.json', boilerplatePath: pathA, cwdPath: pathB, isInBoilerplate: true, isInCwd: true, isJson: true })
	t.is(readJSON.callCount, 2)
	t.deepEqual(readJSON.firstCall.args, [pathA])
	t.deepEqual(readJSON.secondCall.args, [pathB])
	t.is(prompt.callCount, 3)
	t.is(prompt.firstCall.args.length, 1)
	t.is(prompt.secondCall.args.length, 1)
	t.is(prompt.thirdCall.args.length, 1)
	t.deepEqual(removeAnsi(prompt.firstCall.args[0]), {
		initial: false,
		name: 'shouldApply',
		message: 'test.json > aaa > ccc: Key exists in the current project, but not in boilerplate. Remove key (see diff below)?',
		temporaryText: ['@@ -1 +1 @@', '-"234"', '+(removed)', ''].join('\n'),
	})
	t.deepEqual(removeAnsi(prompt.secondCall.args[0]), {
		initial: false,
		name: 'shouldApply',
		message: 'test.json > ddd: Key differs from boilerplace. Replace with boilerplate value (see diff below)?',
		temporaryText: ['@@ -1 +1 @@', '-5', '+4', ''].join('\n'),
	})
	t.deepEqual(removeAnsi(prompt.thirdCall.args[0]), {
		initial: false,
		name: 'shouldApply',
		message: 'test.json > aaa > bbb: Key does not exist in the current project. Copy from boilerplate (see diff below)?',
		temporaryText: ['@@ -1 +1 @@', '-', '+"123"', ''].join('\n'),
	})
	t.is(writeJSON.callCount, 1)
	t.deepEqual(writeJSON.firstCall.args, [pathB, { ...contentA, ddd: 5 }])

	const writeJSONNever = sinon.fake.resolves()
	const promptNever = sinon.fake.resolves(false)
	await createHandleJsonFileInBoth(promptNever, readJSON, writeJSONNever)({ file: 'test.json', boilerplatePath: pathA, cwdPath: pathB, isInBoilerplate: true, isInCwd: true, isJson: true })
	t.is(promptNever.callCount, 3)
	t.is(writeJSONNever.callCount, 0)
})

test('handleFileOnlyInBoilerplate', async t => {
	const pathA = '/home/a/dir/file'
	const pathB = '/home/b/dir/file'

	const mkdirYes = sinon.fake.resolves()
	const copyFileYes = sinon.fake.resolves()
	const promptYes = sinon.fake.resolves(true)

	const expectedPrompt = {
		initial: false,
		name: 'shouldCopy',
		message: 'dir/file: Does not yet exist in the current project. Copy from boilerplate?',
	}

	// yes
	await createHandleFileOnlyInBoilerplate(promptYes, mkdirYes, copyFileYes)({ file: 'dir/file', boilerplatePath: pathA, cwdPath: pathB, isInBoilerplate: true, isInCwd: false, isJson: false })
	t.is(promptYes.callCount, 1)
	t.is(promptYes.firstCall.args.length, 1)
	t.deepEqual(removeAnsi(promptYes.firstCall.args[0]), expectedPrompt)
	t.is(mkdirYes.callCount, 1)
	t.deepEqual(mkdirYes.firstCall.args, ['/home/b/dir', { recursive: true }])
	t.is(copyFileYes.callCount, 1)
	t.deepEqual(copyFileYes.firstCall.args, [pathA, pathB])

	const mkdirNo = sinon.fake.resolves()
	const copyFileNo = sinon.fake.resolves()
	const promptNo = sinon.fake.resolves(false)

	// no
	await createHandleFileOnlyInBoilerplate(promptNo, mkdirNo, copyFileNo)({ file: 'dir/file', boilerplatePath: pathA, cwdPath: pathB, isInBoilerplate: true, isInCwd: false, isJson: false })
	t.is(promptNo.callCount, 1)
	t.is(promptNo.firstCall.args.length, 1)
	t.deepEqual(removeAnsi(promptNo.firstCall.args[0]), expectedPrompt)
	t.is(mkdirNo.callCount, 0)
	t.is(copyFileNo.callCount, 0)
})

test('handleFileOnlyInCwd', async t => {
	const pathA = '/home/a/dir/file'
	const pathB = '/home/b/dir/file'

	const rmYes = sinon.fake.resolves()
	const promptYes = sinon.fake.resolves(true)

	const expectedPrompt = {
		initial: false,
		name: 'shouldRemove',
		message: 'dir/file: Exists in the current project, but not in boilerplate. Remove file?',
	}

	// yes
	await createHandleFileOnlyInCwd(promptYes, rmYes)({ file: 'dir/file', boilerplatePath: pathA, cwdPath: pathB, isInBoilerplate: false, isInCwd: true, isJson: false })
	t.is(promptYes.callCount, 1)
	t.is(promptYes.firstCall.args.length, 1)
	t.deepEqual(removeAnsi(promptYes.firstCall.args[0]), expectedPrompt)
	t.is(rmYes.callCount, 1)
	t.deepEqual(rmYes.firstCall.args, ['/home/b/dir/file'])

	const rmNo = sinon.fake.resolves()
	const promptNo = sinon.fake.resolves(false)

	// no
	await createHandleFileOnlyInCwd(promptNo, rmNo)({ file: 'dir/file', boilerplatePath: pathA, cwdPath: pathB, isInBoilerplate: false, isInCwd: true, isJson: false })
	t.is(promptNo.callCount, 1)
	t.is(promptNo.firstCall.args.length, 1)
	t.deepEqual(removeAnsi(promptNo.firstCall.args[0]), expectedPrompt)
	t.is(rmNo.callCount, 0)
})
