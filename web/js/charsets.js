/* Character sets. Order inside a set does not matter: the renderer measures
   how much ink every glyph leaves in the chosen font and sorts by that. */
(function (GF) {
  'use strict';

  function range(from, to) {
    let s = '';
    for (let c = from; c <= to; c++) s += String.fromCodePoint(c);
    return s;
  }

  const n = (en, tr) => ({ en, tr });

  GF.CHARSET_CATEGORIES = [
    {
      id: 'classic', name: n('Classic ASCII', 'Klasik ASCII'), sets: [
        { id: 'standard', name: n('Standard', 'Standart'), chars: ' .:-=+*#%@' },
        { id: 'detailed', name: n('Detailed (70)', 'Ayrıntılı (70)'), chars: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$" },
        { id: 'minimal', name: n('Minimal', 'Minimal'), chars: ' .oO@' },
        { id: 'punct', name: n('Punctuation', 'Noktalama'), chars: " .,:;'\"!?" },
        { id: 'hatch', name: n('Hatching', 'Tarama'), chars: ' .-/\\|+xX#' }
      ]
    },
    {
      id: 'letters', name: n('Letters & numbers', 'Harf ve rakam'), sets: [
        { id: 'upper', name: n('Uppercase', 'Büyük harf'), chars: ' ' + range(65, 90) },
        { id: 'lower', name: n('Lowercase', 'Küçük harf'), chars: ' ' + range(97, 122) },
        { id: 'digits', name: n('Digits', 'Rakamlar'), chars: ' 0123456789' },
        { id: 'binary', name: n('Binary', 'İkili'), chars: ' 01' },
        { id: 'hex', name: n('Hexadecimal', 'Onaltılık'), chars: ' 0123456789ABCDEF' },
        { id: 'turkish', name: n('Turkish letters', 'Türkçe harfler'), chars: ' çğıöşüÇĞİÖŞÜ' }
      ]
    },
    {
      id: 'blocks', name: n('Blocks', 'Bloklar'), sets: [
        { id: 'shade', name: n('Shade', 'Gölge'), chars: ' ░▒▓█' },
        { id: 'quadrant', name: n('Quadrants', 'Çeyrek blok'), chars: ' ▖▗▘▝▚▞▙▛▜▟█' },
        { id: 'bars', name: n('Vertical bars', 'Dikey çubuk'), chars: ' ▁▂▃▄▅▆▇█' },
        { id: 'half', name: n('Half blocks', 'Yarım blok'), chars: ' ▀▄▌▐█' }
      ]
    },
    {
      id: 'braille', name: n('Braille', 'Braille'), sets: [
        { id: 'full', name: n('All 256 patterns', 'Tüm 256 desen'), chars: range(0x2800, 0x28ff) },
        { id: 'sparse', name: n('Sparse dots', 'Seyrek noktalar'), chars: '⠀⠁⠂⠄⠈⠐⠠⡀⢀⠃⠅⠉⠑⠡⡁⢁⠇⠋⠓⠣⡃⢃' }
      ]
    },
    {
      id: 'geometric', name: n('Geometric', 'Geometrik'), sets: [
        { id: 'circles', name: n('Circles', 'Daireler'), chars: ' ·∘○◌◍◎●' },
        { id: 'squares', name: n('Squares', 'Kareler'), chars: ' ·▫□▪■' },
        { id: 'diamonds', name: n('Diamonds', 'Elmaslar'), chars: ' ·◇◈◆' },
        { id: 'stars', name: n('Stars', 'Yıldızlar'), chars: ' ·✧✦☆★' },
        { id: 'triangles', name: n('Triangles', 'Üçgenler'), chars: ' ·▵△▴▲' },
        { id: 'dots', name: n('Dots', 'Noktalar'), chars: ' .·•●' }
      ]
    },
    {
      id: 'cards', name: n('Cards & games', 'Kart ve oyun'), sets: [
        { id: 'suits', name: n('Card suits', 'Kart takımları'), chars: ' ♤♧♡♢♠♣♥♦' },
        { id: 'hearts', name: n('Lovehearts', 'Kalpler'), chars: ' ·♡♥' },
        { id: 'chess', name: n('Chess', 'Satranç'), chars: ' ♙♘♗♖♕♔♟♞♝♜♛♚' },
        { id: 'dice', name: n('Dice', 'Zarlar'), chars: ' ⚀⚁⚂⚃⚄⚅' }
      ]
    },
    {
      id: 'medieval', name: n('Medieval', 'Ortaçağ'), sets: [
        { id: 'futhark', name: n('Elder Futhark runes', 'Futhark runları'), chars: ' ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ' },
        { id: 'younger', name: n('Younger Futhark', 'Genç Futhark'), chars: ' ᚠᚢᚦᚬᚱᚴᚼᚾᛁᛅᛋᛏᛒᛘᛚᛦ' },
        { id: 'scribe', name: n('Scribe marks', 'Kâtip işaretleri'), chars: ' ·†‡§¶¤' },
        { id: 'roman', name: n('Roman numerals', 'Roma rakamları'), chars: ' IVXLCDM' }
      ]
    },
    {
      id: 'scripts', name: n('Other scripts', 'Diğer alfabeler'), sets: [
        { id: 'katakana', name: n('Katakana (matrix)', 'Katakana (matrix)'), chars: ' ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' },
        { id: 'greek', name: n('Greek', 'Yunanca'), chars: ' αβγδεζηθικλμνξοπρστυφχψωΔΘΛΞΠΣΦΨΩ' },
        { id: 'cyrillic', name: n('Cyrillic', 'Kiril'), chars: ' бвгджзийклмнпрстфхцчшщъыьэюяЖЩШФЯ' }
      ]
    },
    {
      id: 'lines', name: n('Lines & symbols', 'Çizgi ve sembol'), sets: [
        { id: 'box', name: n('Box drawing', 'Kutu çizgileri'), chars: ' ─│┌┐└┘├┤┬┴┼═║╬' },
        { id: 'arrows', name: n('Arrows', 'Oklar'), chars: ' ←↑→↓↖↗↘↙↔↕' },
        { id: 'math', name: n('Math', 'Matematik'), chars: ' ·+-×÷=≠≈∑∏√∞' },
        { id: 'code', name: n('Code', 'Kod'), chars: ' .;:=+*{}[]()<>/\\|&#' }
      ]
    }
  ];

  GF.charsetChars = function (key) {
    const [catId, setId] = String(key || '').split('/');
    const cat = GF.CHARSET_CATEGORIES.find((c) => c.id === catId) || GF.CHARSET_CATEGORIES[0];
    const set = cat.sets.find((s) => s.id === setId) || cat.sets[0];
    return set.chars;
  };
})(window.GF = window.GF || {});
