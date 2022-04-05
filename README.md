# cidr-ip-range README

## Features

Shows annotations for IPV4 cidr ranges with the number of addresses in the range.

Tooltip provides more detailed information on hover.

![CIDR tooltip and annotations](./images/ip-range.png)

Uses the [cidr-regex](https://www.npmjs.com/package/cidr-regex) and [ip](https://www.npmjs.com/package/ip) libraries to find ipv4 cidr ranges in open documents and display information about them.

There is a codelens action to copy the information to the clipboard, which can be enabled by adding the following to your settings.json

```json
"cidr-ip-range": {
  "enableCodeLens": true,
  "codeLensFormat": "json"
},
```

You can alternatively copy the data as it appears in the table by changing the `codeLensFormat` to "table"

```json
"cidr-ip-range": {
  "enableCodeLens": true,
  "codeLensFormat": "table"
},
```

## Still to do

Support IPV6

## Release Notes

### 0.0.1

Initial release of cidr-ip-range

### 0.0.4

Added codelens ability to copy data to clipboard, suggested by Thomas Schlesinger

### 0.0.5

Added copy to clipboard format types (json / table)
