const { ScannerHandler } = require('../src/scanner');

describe('ScannerHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ScannerHandler();
  });

  test('should not be ready before execute', () => {
    expect(handler.isReady).toBe(false);
  });

  test('should initialize on execute', async () => {
    handler._run = jest.fn().mockResolvedValue('result');
    await handler.execute();
    expect(handler.isReady).toBe(true);
  });

  test('should pass arguments to _run', async () => {
    handler._run = jest.fn().mockResolvedValue('ok');
    await handler.execute('arg1', 'arg2');
    expect(handler._run).toHaveBeenCalledWith('arg1', 'arg2');
  });

  test('should throw if _run not implemented', async () => {
    await expect(handler.execute()).rejects.toThrow('Not implemented');
  });
});
