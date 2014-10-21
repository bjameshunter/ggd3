var fs = require('fs'),
	document = require('jsdom').jsdom('<html><head></head><body></body></html>'),
	window = document.parentWindow;

module.exports = function (path) {
	// read angular source into memory
	var src = fs.readFileSync(path, 'utf8');

	// replace implicit references
	src = src.split('angular.element(document)').join('window.angular.element(document)');
	src = src.split('(navigator.userAgent)').join('(window.navigator.userAgent)');
	src = src.split('angular.$$csp').join('window.angular.$$csp');

	(new Function('window', 'document', src))(window, document);

	return window.angular;
}
