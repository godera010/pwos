import os
import re
import json
import markdown

MD_DIR = os.path.abspath(r"docs/markdown")
WEB_DIR = os.path.abspath(r"docs/web")

CATEGORIES = [
    {"dir": "getting_started", "category": "Getting Started", "icon": "rocket"},
    {"dir": "core_guides", "category": "Core Guides", "icon": "book-open"},
    {"dir": "system_architecture", "category": "System Architecture", "icon": "cpu"},
    {"dir": "ml", "category": "Machine Learning", "icon": "brain"},
    {"dir": "hardware", "category": "Hardware", "icon": "circuit-board"},
    {"dir": "simulation", "category": "Simulation", "icon": "monitor"},
    {"dir": "scientific_research", "category": "Scientific Research", "icon": "flask-conical"},
    {"dir": "reports_and_validation", "category": "Reports and Validation", "icon": "bar-chart"},
    {"dir": "technical_reference", "category": "Technical Reference", "icon": "book"}
]

def get_md_title(md_path):
    try:
        with open(md_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip().startswith('#'):
                    title = line.strip().lstrip('#').strip()
                    title = re.sub(r'^[^\w\s\(\)\[\]\-]+', '', title).strip() # Strip emojis/symbols
                    return title
    except Exception:
        pass
    base = os.path.basename(md_path)
    name = os.path.splitext(base)[0]
    return name.replace('_', ' ').title()

def link_replacer(match):
    href = match.group(1)
    if href.startswith(('http://', 'https://', 'mailto:', 'ftp:', '#')):
        return match.group(0)
    # Check if there is an anchor, e.g., foo.md#anchor
    anchor = ""
    if '#' in href:
        href, anchor = href.split('#', 1)
        anchor = '#' + anchor
    
    if href.endswith('.md'):
        href = href[:-3] + '.html'
    return f'href="{href}{anchor}"'

def get_depth_and_prefix(base_dir, file_path):
    rel = os.path.relpath(os.path.dirname(file_path), base_dir)
    if rel == '.':
        return 0, "./"
    depth = len(rel.split(os.sep))
    return depth, "../" * depth

def find_any_existing_html():
    for root, _, files in os.walk(WEB_DIR):
        for f in files:
            if f.endswith('.html') and f != 'index.html':
                full = os.path.join(root, f)
                return full
    return None

def build():
    print("Building documentation portal...")
    
    # 1. Scan and build docs navigation structure
    docs_structure = []
    search_index = []
    
    for cat in CATEGORIES:
        cat_dir = os.path.join(MD_DIR, cat["dir"])
        if not os.path.exists(cat_dir):
            continue
        
        pages = []
        file_paths = []
        for root, _, files in os.walk(cat_dir):
            for f in files:
                if f.endswith('.md'):
                    full = os.path.join(root, f)
                    rel = os.path.relpath(full, MD_DIR)
                    file_paths.append((rel, full))
        
        # Sort files so README/index goes first, then alphabetically
        def sort_key(item):
            name = item.lower()
            if name == 'readme.md' or name == 'index.md':
                return ('', name)
            return (name, name)
        
        file_paths.sort(key=lambda x: [sort_key(part) for part in x[0].split(os.sep)])
        
        for rel_path, full_path in file_paths:
            title = get_md_title(full_path)
            html_file = rel_path.replace('.md', '.html').replace('\\', '/')
            pages.append({
                "title": title,
                "file": html_file
            })
            
            # Read markdown content for search index
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read().lower()
            except Exception:
                content = ""
                
            search_index.append({
                "file": html_file,
                "title": title,
                "category": cat["category"],
                "content": content
            })
            
        if pages:
            docs_structure.append({
                "category": cat["category"],
                "icon": cat["icon"],
                "pages": pages
            })
            
    # Also add MASTER_SYSTEM_MANUAL to search index and list
    manual_md = os.path.join(MD_DIR, "MASTER_SYSTEM_MANUAL.md")
    if os.path.exists(manual_md):
        try:
            with open(manual_md, 'r', encoding='utf-8') as f:
                content = f.read().lower()
        except Exception:
            content = ""
        search_index.append({
            "file": "MASTER_SYSTEM_MANUAL.html",
            "title": "Master System Manual",
            "category": "Documentation",
            "content": content
        })
        
    docs_json = json.dumps(docs_structure, ensure_ascii=False)
    
    # 2. Convert markdown files to HTML
    # We walk MD_DIR and find all .md files (including root files)
    md_files = []
    for root, _, files in os.walk(MD_DIR):
        for f in files:
            if f.endswith('.md'):
                md_files.append(os.path.join(root, f))
                
    for md_path in md_files:
        rel_path = os.path.relpath(md_path, MD_DIR)
        html_rel_path = os.path.splitext(rel_path)[0] + '.html'
        html_path = os.path.join(WEB_DIR, html_rel_path)
        
        print(f"Converting {rel_path} -> {html_rel_path}")
        
        # Read markdown
        with open(md_path, 'r', encoding='utf-8') as f:
            md_text = f.read()
            
        # Convert markdown to HTML
        converted_html = markdown.markdown(md_text, extensions=['fenced_code', 'tables'])
        
        # Replace .md links with .html links
        converted_html = re.sub(r'href="([^"]+)"', link_replacer, converted_html)
        
        template_source = os.path.join(WEB_DIR, "index.html")
            
        # Read template
        with open(template_source, 'r', encoding='utf-8') as f:
            template_content = f.read()
            
        # Determine target depth prefix and template depth prefix
        target_depth, target_prefix = get_depth_and_prefix(WEB_DIR, html_path)
        temp_depth, temp_prefix = get_depth_and_prefix(WEB_DIR, template_source)
        
        # Adjust prefix in template if they don't match
        if target_prefix != temp_prefix:
            # We want to replace temp_prefix with target_prefix, but be careful of overlapping names.
            # Usually temp_prefix is like "../" or "../../" and target_prefix is like "../../" or "../".
            # Replace paths to search_index.js and other relative paths
            template_content = template_content.replace(temp_prefix, target_prefix)
            
        # Find markdownOutput container
        start_idx = template_content.find('<div id="markdownOutput"')
        if start_idx == -1:
            start_idx = template_content.lower().find('id="markdownoutput"')
            start_idx = template_content.rfind('<div', 0, start_idx)
            
        if start_idx == -1:
            raise Exception(f"Could not find '#markdownOutput' in template {template_source}")
            
        content_start_idx = template_content.find('>', start_idx) + 1
        article_idx = template_content.find('</article>')
        closing_div_idx = template_content.rfind('</div>', 0, article_idx)
        
        prefix = template_content[:content_start_idx]
        suffix = template_content[closing_div_idx:]
        
        # Build new HTML content
        new_html = prefix + "\n" + converted_html + "\n                            " + suffix
        
        # Update title
        title = get_md_title(md_path)
        new_html = re.sub(r'<title>.*?</title>', f'<title>{title} - P-WOS Documentation Portal</title>', new_html)
        
        # Update breadcrumbs
        # Determine category name
        parent_dir = os.path.basename(os.path.dirname(md_path))
        category_name = "Documentation"
        for cat in CATEGORIES:
            if cat["dir"] == parent_dir:
                category_name = cat["category"]
                break
        
        filename = os.path.basename(md_path)
        new_html = re.sub(r'<span id="breadcrumbCategory">.*?</span>', f'<span id="breadcrumbCategory">{category_name}</span>', new_html)
        new_html = re.sub(r'<span id="breadcrumbTitle" class="text-emerald-500 font-mono">.*?</span>', f'<span id="breadcrumbTitle" class="text-emerald-500 font-mono">{filename}</span>', new_html)
        
        # Update docs navigation array
        lines = new_html.splitlines()
        for i, line in enumerate(lines):
            if 'const docs = [' in line:
                indent = line[:line.find('const docs =')]
                lines[i] = f"{indent}const docs = {docs_json};"
                break
        new_html = '\n'.join(lines)
        
        # Write updated HTML file
        os.makedirs(os.path.dirname(html_path), exist_ok=True)
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(new_html)
            
    # Also update docs/web/index.html (landing page) using docs/markdown/getting_started/README.md as base!
    print("Updating landing page: docs/web/index.html")
    landing_md = os.path.join(MD_DIR, "getting_started", "README.md")
    landing_html_path = os.path.join(WEB_DIR, "index.html")
    
    with open(landing_md, 'r', encoding='utf-8') as f:
        landing_text = f.read()
        
    converted_landing = markdown.markdown(landing_text, extensions=['fenced_code', 'tables'])
    converted_landing = re.sub(r'href="([^"]+)"', link_replacer, converted_landing)
    
    # Since index.html is at root (depth 0), we want to adjust the links inside it that were converted from relative paths.
    # In getting_started/README.md, links were relative to getting_started/ (e.g. 01_project_overview.md or ../core_guides/setup/QUICKSTART.md).
    # Since index.html is at the root, a link to 01_project_overview.html becomes getting_started/01_project_overview.html.
    # And a link to ../core_guides/setup/QUICKSTART.html becomes core_guides/setup/QUICKSTART.html.
    # Let's adjust them in the converted landing page HTML!
    def root_link_resolver(match):
        href = match.group(1)
        if href.startswith(('http://', 'https://', 'mailto:', 'ftp:', '#')):
            return match.group(0)
        # If it starts with '../', remove '../'
        if href.startswith('../'):
            href = href[3:]
        else:
            # If it's a sibling of getting_started, prepend getting_started/
            href = 'getting_started/' + href
        return f'href="{href}"'
        
    converted_landing = re.sub(r'href="([^"]+)"', root_link_resolver, converted_landing)
    
    # Read index.html as template
    with open(landing_html_path, 'r', encoding='utf-8') as f:
        index_template = f.read()
        
    start_idx = index_template.find('<div id="markdownOutput"')
    if start_idx == -1:
        start_idx = index_template.lower().find('id="markdownoutput"')
        start_idx = index_template.rfind('<div', 0, start_idx)
        
    content_start_idx = index_template.find('>', start_idx) + 1
    article_idx = index_template.find('</article>')
    closing_div_idx = index_template.rfind('</div>', 0, article_idx)
    
    prefix = index_template[:content_start_idx]
    suffix = index_template[closing_div_idx:]
    
    new_index_html = prefix + "\n" + converted_landing + "\n                            " + suffix
    
    # Update title
    new_index_html = re.sub(r'<title>.*?</title>', '<title>P-WOS Documentation - P-WOS Documentation Portal</title>', new_index_html)
    
    # Update docs navigation array in index.html
    lines = new_index_html.splitlines()
    for i, line in enumerate(lines):
        if 'const docs = [' in line:
            indent = line[:line.find('const docs =')]
            lines[i] = f"{indent}const docs = {docs_json};"
            break
    new_index_html = '\n'.join(lines)
    
    with open(landing_html_path, 'w', encoding='utf-8') as f:
        f.write(new_index_html)
        
    # 3. Write search index js file
    print("Writing search index...")
    search_index_path = os.path.join(WEB_DIR, "search_index.js")
    search_index_json = json.dumps(search_index, ensure_ascii=False)
    with open(search_index_path, 'w', encoding='utf-8') as f:
        f.write(f"const searchIndex = {search_index_json};")
        
    print("Documentation portal build completed successfully!")

if __name__ == "__main__":
    build()
