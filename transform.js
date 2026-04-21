const fs = require('fs');

function singularize(type) {
  if (type.endsWith('ies')) return type.slice(0, -3) + 'y';
  if (type.endsWith('s')) return type.slice(0, -1);
  return 'item';
}

function transform(key, value, parentType = 'root') {
  if (value === null || value === undefined || value === '') return null;

  let node = { type: key };

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    node.items = value.map(item => transform(singularize(key), item, key)).filter(Boolean);
    if (node.items.length === 0) return null;
    node.name = key; // Requirement says every node has 'name'. 
  } else if (typeof value === 'object') {
    let childKeys = Object.keys(value);
    if (childKeys.length === 0) return null;

    // Rules for object attributes
    if (typeof value.name === 'string') {
      node.name = value.name;
      childKeys = childKeys.filter(k => k !== 'name');
    } else if (typeof value.id === 'string') {
      node.name = value.id;
      // keep type as parent key (already set by node.type = key)
    } else if (typeof value.value === 'string') {
        node.name = value.value;
        childKeys = childKeys.filter(k => k !== 'value');
    } else {
        node.name = key;
    }

    if (typeof value.title === 'string') {
      node.subtitle = value.title;
      childKeys = childKeys.filter(k => k !== 'title');
    }
    if (typeof value.subtitle === 'string') {
      node.subtitle = value.subtitle;
      childKeys = childKeys.filter(k => k !== 'subtitle');
    }
    if (typeof value.icon === 'string') {
      node.icon = value.icon;
      childKeys = childKeys.filter(k => k !== 'icon');
    }

    const items = childKeys.map(k => transform(k, value[k], key)).filter(Boolean);
    if (items.length > 0) {
      node.items = items;
    }
  } else {
    // Primitive
    node.name = String(value);
  }

  // Ensure name is always present
  if (node.name === undefined) node.name = key;

  return node;
}

const inputPath = 'src/app/newdata';
let inputData;
try {
    const raw = fs.readFileSync(inputPath, 'utf8');
    if (!raw) {
        console.error("Input file is empty");
        process.exit(0);
    }
    inputData = JSON.parse(raw);
} catch (e) {
    console.error("Error reading or parsing input:", e);
    process.exit(0);
}

const result = {
  type: "root",
  name: "newdata",
  items: Object.keys(inputData).map(k => transform(k, inputData[k])).filter(Boolean)
};

fs.writeFileSync(inputPath, JSON.stringify(result, null, 2));
