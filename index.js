const fs = require('fs')
const Path = require('path')
const express = require('express')
const archiver = require('archiver')
const app = express()
const port = 8000
const buildDir = 'build'
const fteDir = 'fte'
const pk3name = 'build.pk3'

const argv = process.argv
const gamedir = process.argv[2];
const modname = Path.basename(gamedir)

const fmfargs = `
package ${modname}/data.pk3 - ./${pk3name}

`

const wrapPromise1 = (fn, arg) => new Promise(
	(resolve, reject) => fn(arg,
		(err, res) =>  {
			if (err) reject(err)
			resolve(res)
		}
	)
)

const wrapPromise2 = (fn, arg1, arg2) => new Promise(
	(resolve, reject) => fn(arg1, arg2,
		(err, res) =>  {
			if (err) reject(err)
			resolve(res)
		}
	)
)

const wrapPromise3 = (fn, arg1, arg2, arg3) => new Promise(
	(resolve, reject) => fn(arg1, arg2, arg3,
		(err, res) =>  {
			if (err) reject(err)
			resolve(res)
		}
	)
)

const readdirPromise = dir => {
	return new Promise((resolve, reject) => {
		fs.readdir(dir, (err, files) => {
			if (err) reject(err)
			resolve(files)
		})
	})
}

const checkExists = path => {
	return new Promise((resolve, reject) => {
		fs.access(path, err => {
			if (err) resolve(false)
			resolve(true)
		})
	})
}
	
const debounce = (fn, timems) => {
	let timeout = undefined
	return () => {
		timeout && clearTimeout(timeout)
		timeout = setTimeout(fn, timems)
	}
}

let clientsWaiting = []

const refreshClients = () => {
	clientsWaiting.forEach(res => res.sendStatus(200))
	clientsWaiting = []
}

const repackage = async () => new Promise((resolve, reject) => {
	console.log('Bundling game files...')
	
	const output = fs.createWriteStream(Path.join(buildDir, pk3name))
	const archive = archiver('zip', { zlib: { level: 0 } })
	output.on('close', () => {
		console.log('Created ' + pk3name + ', ' + archive.pointer() + ' bytes written.')
		resolve(true)
	})
	
	archive.on('warning', (err) => {
		if (err.code === 'ENOENT') {
			console.warn(err)
		} else {
			reject(err)
		}
	})
	
	archive.on('error', reject)
	
	archive.pipe(output)
	
	archive.directory(gamedir, false)
	
	archive.finalize()
})

const repackageAndRefresh = () => repackage().then(refreshClients)

const watchProgs = async () => {
	const progsFiles = ['progs.dat', 'qwprogs.dat', 'csprogs.dat', 'menu.dat']
	
	try {
		const files = await readdirPromise(gamedir)
		const watchFiles = progsFiles.reduce((acc, val, idx) => {
			const currentAddition = files.includes(val) ? [val] : []
			if (idx == 1) {
				// First iteration, acc = first value in array, retarded vanilla-js reduce
				if (files.includes(acc)) {
					return [acc].concat(currentAddition)
				}
				return [].concat(currentAddition)
			}
			return acc.concat(currentAddition)
		})
		if (watchFiles.length === 0)
		{
			console.log('Could not find progs files in game dir')
			return false
		}
		console.log('Found progs files: ', watchFiles.join(', '))
		const watchFn = debounce(repackageAndRefresh, 500);
		watchFiles.forEach(file => fs.watchFile(Path.join(gamedir, file), watchFn))
		return true
	} catch (error) {
		console.log('Could not read game dir', error)
		return false
	}
}

const prepareBuildDir = async () => {
	const exists = await checkExists(buildDir)
	if (!exists) {
		try {
			await wrapPromise1(fs.mkdir, buildDir)
		} catch (error) {
			console.log('Could not create build dir', error)
			return 0
		}
	} else {
		// clear directory
		const files = await readdirPromise(buildDir)
		try {
			const promises = files.map(
				file => wrapPromise1(fs.unlink, Path.join(buildDir, file))
			)
			await Promise.all(promises)
		} catch (error) {
			console.log('Error clearing build dir', error)
			return 0
		}
	}
	
	// copy the fte files over
	try {
		const ftePromises = [
			'ftewebgl.html',
			'ftewebgl.js',
			'ftewebgl.wasm'
		].map(
			file => wrapPromise2(fs.copyFile, Path.join(fteDir, file), Path.join(buildDir, file))
		)
		await Promise.all(ftePromises)
		console.log('Copied FTE web build')
	} catch (error) {
		console.log('Failed to copy FTE files', error)
		return 0
	}
	
	// prepare the FMF file
	try {
		const fmfpath = Path.join(buildDir, 'default.fmf')
		await wrapPromise2(fs.copyFile, Path.join(gamedir, '../default.fmf'), fmfpath)
		await wrapPromise2(fs.appendFile, fmfpath, fmfargs)
	} catch (error) {
		console.log('Failed to create .fmf', error)
		return 0
	}
	
	return repackage()
}

const init = async () => {
	if (await !prepareBuildDir())
		return 0

	const valid = await watchProgs()
	if (!valid) {
		return 0
	}
	
	const root = Path.join(__dirname)
	
	app.use(express.static(buildDir, { extensions: ['jpg', 'html', 'js', 'wasm', 'pk3', 'fmf'] }))
	
	
	app.get('/', (req, res) => {
		res.sendFile('index.html', { root })
		// res.redirect('/ftewebgl.html#default.fmf')
	})
	
	app.get('/reload', (req, res) => {
		clientsWaiting.push(res)
	})


	app.listen(port, () => {
		console.log('Listening at http://localhost:' + port)
	})
}

init()
