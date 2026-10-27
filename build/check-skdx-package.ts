/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appRoot = process.argv[2];
assert.ok(appRoot, 'Pass the packaged resources/app directory.');
const sourceRoot = path.resolve(import.meta.dirname, '..');
const sourceProduct = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'product.json'), 'utf8'));
const packagedProduct = JSON.parse(fs.readFileSync(path.join(appRoot, 'product.json'), 'utf8'));
// Compare the complete configuration: a packaging overlay must not drop services, built-ins, or identity.
assert.deepStrictEqual(Object.fromEntries(Object.keys(sourceProduct).map(key => [key, packagedProduct[key]])), sourceProduct);
const sourcePackage = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'package.json'), 'utf8'));
const packagedPackage = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
assert.equal(packagedPackage.version, sourcePackage.version);
const isDarwinBundle = appRoot.includes(`${path.sep}Contents${path.sep}`);
assert.equal(packagedPackage.name, isDarwinBundle ? sourceProduct.nameShort : sourceProduct.applicationName);
for (const file of ['LICENSE.txt', 'ThirdPartyNotices.txt']) {
	assert.deepStrictEqual(fs.readFileSync(path.join(appRoot, file)), fs.readFileSync(path.join(sourceRoot, file)));
}
console.log(`Packaged identity, editor version, services, built-in extension metadata, licenses match: ${appRoot}`);
