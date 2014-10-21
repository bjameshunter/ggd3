var test = require('tape'),
	path = require('path'),
	angular = require('../'),
	inject = angular.injector(['ng']).invoke,
	version = require(path.resolve('./package.json')).version;

test('core', function (t) {

	test('init', function (t) {
		t.true(angular, 'Angular instance is defined');
		t.end();
	});

	test('version', function (t) {
		t.equal(angular.version.full, version, 'Angular and package versions match');
		t.end();
	});

	t.end();
});

test('injector', function (t) {
	var el;

	test('should compile a binding', function (t) {

		inject(function ($rootScope, $compile) {
			el = angular.element('<div>{{ 2 + 2 }}</div>');
			el = $compile(el)($rootScope);
			$rootScope.$digest();
		})

		t.equal(+el.html(), 4, 'simple binding compiled');

		t.end();
	});

	t.end();
});

test('custom paths', function (t) {
	var ngMinified = require('../min'),
		ngCustom = require('../custom')(__dirname + '/fixtures/foo.js');

	t.equal(ngMinified.version.full, version, 'Angular minified and package versions match');
	t.equal(ngCustom.version.full, version, 'Custom Angular and package versions match');
	t.end();
})
