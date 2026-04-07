import re

def update_docs():
    files = [
        "docs/hardware/breadboard_assembly.md",
        "docs/hardware/breadboard_assembly.html"
    ]
    
    replacements = [
        # Pin definitions text
        (r'GPIO 25  = DHT11 data \(digital\)\s+— Left pin 11  ? Col 11',
         r'GPIO 14  = DHT11 data (digital)                — Left pin 8   ? Col 8 '),
        (r'GPIO 26  = Relay IN \(future\)\s+— Left pin 10  ? Col 10',
         r'GPIO 27  = Relay IN (future)                   — Left pin 9   ? Col 9 '),
        
        # Pin mapping table (markdown and HTML classes might vary)
        (r'¦ Col  8   ¦ GPIO 14                 ¦ Col  8   ¦ GPIO 16                ¦',
         r'¦ Col  8   ¦ GPIO 14 ?               ¦ Col  8   ¦ GPIO 16                ¦'),
        (r'¦ Col  9   ¦ GPIO 27                 ¦ Col  9   ¦ GPIO 17                ¦',
         r'¦ Col  9   ¦ GPIO 27 ?               ¦ Col  9   ¦ GPIO 17                ¦'),
        (r'¦ Col 10   ¦ GPIO 26 ?               ¦ Col 10   ¦ GPIO 5                  ¦',
         r'¦ Col 10   ¦ GPIO 26                 ¦ Col 10   ¦ GPIO 5                  ¦'),
        (r'¦ Col 11   ¦ GPIO 25 ?               ¦ Col 11   ¦ GPIO 18                ¦',
         r'¦ Col 11   ¦ GPIO 25                 ¦ Col 11   ¦ GPIO 18                ¦'),
         
        # Additional table HTML replacements
        (r'<tr><td><span class="col-badge">10</span></td><td>GPIO 26</td><td class="pin-use">? Relay IN \(future\)</td></tr>',
         r'<tr><td><span class="col-badge">10</span></td><td>GPIO 26</td><td>—</td></tr>'),
        (r'<tr><td><span class="col-badge">11</span></td><td>GPIO 25</td><td class="pin-use">? DHT11 DATA</td></tr>',
         r'<tr><td><span class="col-badge">11</span></td><td>GPIO 25</td><td>—</td></tr>'),
         
        (r'<tr><td><span class="col-badge">8</span></td><td>GPIO 14</td><td>—</td></tr>',
         r'<tr><td><span class="col-badge">8</span></td><td>GPIO 14</td><td class="pin-use">? DHT11 DATA</td></tr>'),
        (r'<tr><td><span class="col-badge">9</span></td><td>GPIO 27</td><td>—</td></tr>',
         r'<tr><td><span class="col-badge">9</span></td><td>GPIO 27</td><td class="pin-use">? Relay IN (future)</td></tr>'),

        # Wiring details
        (r'Col 11, Row A \(GPIO 25\)', 'Col 8, Row A (GPIO 14)'),
        (r'Col 11 Row A \(DHT11 DATA ? GPIO 25\)', 'Col 8 Row A (DHT11 DATA ? GPIO 14)'),
        (r'Col 11, Row A \| DHT11 DATA ? GPIO 25', 'Col 8, Row A | DHT11 DATA ? GPIO 14'),
        (r'Col 10, Row A \(GPIO 26\)', 'Col 9, Row A (GPIO 27)'),
        (r'GPIO 26 HIGH', 'GPIO 27 HIGH'),
        (r'GPIO 26 LOW', 'GPIO 27 LOW'),

        # specific for the HTML wire text
        (r'Col 11, Row A', 'Col 8, Row A'),
        (r'Col 10, Row A', 'Col 9, Row A'),
        (r'GPIO 25 left pin', 'GPIO 14 left pin'),
        (r'GPIO 25', 'GPIO 14'), # we need to be careful with this global
    ]
    
    for f in files:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            
        # specifically replace "GPIO 25" to "GPIO 14" where context is DHT11
        content = content.replace("GPIO 25 (ESP32 left pin", "GPIO 14 (ESP32 left pin")
        
        for old, new in replacements:
            content = re.sub(old, new, content)
            
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

if __name__ == '__main__':
    update_docs()
