import { ApplicationNamePage } from './app.po';

describe('application-name App', function() {
  let page: ApplicationNamePage;

  beforeEach(() => {
    page = new ApplicationNamePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
