"""Isolated built-app tests: all Firebase traffic blocked, device/demo data only."""
import unittest,json,threading,tempfile,shutil,os
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def translate_path(self,path):
        path=unquote(urlparse(path).path)
        if path.startswith('/RezaDrive/'):path=path[len('/RezaDrive/'):]
        return str(ROOT/'dist'/path.lstrip('/'))
class DriveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler);cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start();cls.origin='http://127.0.0.1:'+str(cls.server.server_port)
        cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(headless=True,args=['--no-sandbox'])
    @classmethod
    def tearDownClass(cls):cls.browser.close();cls.p.stop();cls.server.shutdown();cls.server.server_close();cls.thread.join()
    def setUp(self):
        self.context=self.browser.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Kuala_Lumpur',service_workers='block');self.page=self.context.new_page();self.errors=[];self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        def route(r):
            if r.request.url.endswith('cloud-config.json'):r.fulfill(json={'enabled':False,'firebaseConfig':{}})
            elif r.request.url.startswith(self.origin):r.continue_()
            else:r.abort()
        self.page.route('**/*',route);self.page.goto(self.origin+'/RezaDrive/');self.page.get_by_role('button',name='Lihat demo',exact=True).click()
    def tearDown(self):self.context.close();self.assertEqual(self.errors,[])
    def button(self,name):return self.page.get_by_role('button',name=name,exact=True)
    def settings(self):self.button('Akaun').click()
    def test_theme_search_undo(self):
        self.settings();self.page.get_by_label('Tema',exact=True).select_option('dark');self.button('Tutup').click();self.assertEqual(self.page.locator('html').get_attribute('data-theme'),'dark')
        self.button('Sejarah').click();self.page.get_by_role('searchbox').fill('Kepong');self.assertEqual(self.page.locator('.search-results .record-row').count(),2)
        self.page.locator('.search-results').get_by_role('button',name='Padam',exact=True).first.click();self.button('Padam rekod').click();self.assertEqual(self.page.locator('.search-results .record-row').count(),1);self.button('Batal padam').click();self.assertEqual(self.page.locator('.search-results .record-row').count(),2)
    def test_backup_preview_atomic_replace_recovery(self):
        self.settings()
        with self.page.expect_download() as event:self.button('Muat turun backup JSON').click()
        original=json.loads(Path(event.value.path()).read_text());original['records'][1]['data']['net']=80
        input=self.page.get_by_label('Import backup JSON',exact=True)
        input.set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(original).encode()})
        self.assertIn('Dikemas kini: 1',self.page.locator('.import-preview').inner_text());self.assertFalse(self.button('Simpan import').is_enabled());self.page.locator('.import-preview input[type=checkbox]').check();self.button('Simpan import').click();self.assertEqual(self.page.get_by_role('button',name='Muat turun salinan sebelum import',exact=False).count(),1)
        input.set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"records":[{}]}'})
        self.assertIn('Backup tidak sah',self.page.locator('.toast').inner_text())
    def test_report_pdf_and_summary(self):
        self.button('Laporan').click()
        month=self.page.get_by_label('Bulan laporan',exact=True).input_value()
        income={'app':'RezaIncome','schemaVersion':1,'source':'RezaOT','month':month,'basis':'received','amount':3300,'exportedAt':'2026-11-01T00:00:00Z'}
        self.page.get_by_label('Import ringkasan RezaOT',exact=True).set_input_files({'name':'income.json','mimeType':'application/json','buffer':json.dumps(income).encode()});self.button('Sahkan ringkasan ini').click()
        self.assertIn('3,349.94',self.page.locator('.monthly-tools').inner_text())
        self.page.emulate_media(media='print');self.assertTrue(self.page.locator('.drive-print').is_visible());self.assertEqual(self.page.locator('.drive-print tbody tr').count(),5)
        with tempfile.TemporaryDirectory() as d:
            pdf=self.page.pdf(path=d+'/report.pdf',format='A4',print_background=True);self.assertTrue(pdf.startswith(b'%PDF'));self.assertGreater(len(pdf),4000)
        self.page.emulate_media(media='screen')
        for width in [320,390,1440]:
            self.page.set_viewport_size({'width':width,'height':900});self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width+1)
if __name__=='__main__':unittest.main(verbosity=2)
