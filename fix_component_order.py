import sys

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find TreeNodeComponent
    tree_node_marker = '/**\n * Tree node renderer component\n */'
    if tree_node_marker not in content:
        tree_node_marker = '@Component({\n  selector: \'app-tree-node\','
        
    start_idx = content.find(tree_node_marker)
    if start_idx == -1:
        print("Could not find TreeNodeComponent marker")
        return

    # TreeNodeComponent is at the end of the file
    tree_node_code = content[start_idx:]
    remaining_code = content[:start_idx]

    # Find where imports end and ElementRendererComponent starts
    element_renderer_marker = '/**\n * Generic recursive element renderer'
    if element_renderer_marker not in remaining_code:
        element_renderer_marker = '@Component({\n  selector: \'app-element-renderer\','
        
    insert_idx = remaining_code.find(element_renderer_marker)
    if insert_idx == -1:
        print("Could not find ElementRendererComponent marker")
        return

    # Reconstruct the file
    new_content = remaining_code[:insert_idx] + tree_node_code + "\n" + remaining_code[insert_idx:]
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    print("Successfully reorganized file")

if __name__ == "__main__":
    fix_file(sys.argv[1])
