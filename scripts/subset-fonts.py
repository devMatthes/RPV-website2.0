"""Run with Python + fonttools[brotli] after npm install. Preserves variable weight axes."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
import shutil
root = Path(__file__).resolve().parents[1]
polish = 'ĄąĆćĘęŁłŃńŚśŹźŻż'
for family in ['roboto', 'inter', 'plus-jakarta-sans']:
    package = root / 'node_modules/@fontsource-variable' / family
    source = package / 'files' / f'{family}-latin-ext-wght-normal.woff2'
    font = TTFont(source)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    processor = subset.Subsetter(options=options)
    processor.populate(text=polish)
    processor.subset(font)
    output = root / 'src/assets/fonts' / f'{family}-polish-wght-normal.woff2'
    font.save(output)
    assert set(map(ord, polish)) <= set(font.getBestCmap()), family
    assert 'fvar' in font, family
    shutil.copy(package / 'LICENSE', output.parent / f'{family}-LICENSE.txt')
    print(f'{family}: {source.stat().st_size} -> {output.stat().st_size} bytes')
