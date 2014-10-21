var request = require('request'),
	fs = require('fs'),
	path = require('path'),
	exec = require('child_process').exec,
	version = require('../package.json').version;

var urlStub = 'http://code.angularjs.org/',
	files = ['/angular.js', '/angular.min.js', '/angular.min.js.map'];

function getFile (index) {
	var file = files[index],
		writer = fs.createWriteStream('lib' + file);

	writer.on('finish', function () {
		console.log(file.substr(1), 'fetched and written');
		if (index < files.length - 1) {
			getFile(index + 1);
		} else {
			copyToCustomLocation();
			testAndTag();
		}
	});

	request(urlStub + version + file).pipe(writer);
};

function copyToCustomLocation () {
	fs.createReadStream('lib' + files[0]).pipe(fs.createWriteStream('test/fixtures/foo.js'));
}

function testAndTag () {
	console.log('running tests');
	exec('npm test', function (error, stdout, stderr) {
		if (error !== null) {
			console.log('test error: ' + error);
		} else {
			exec('git commit -am "Angular v' + version + ' with Browserify support"', function (err) {
				if (error === null) {
					exec('git tag v' + version);
					console.log('Angular successfully updated to v' + version);
				}
			});
		}
	});
}

getFile(0);
