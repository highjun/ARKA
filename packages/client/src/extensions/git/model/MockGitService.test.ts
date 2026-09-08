import { testGitServiceContract } from './gitService.contract';
import { MockGitService } from './MockGitService';

testGitServiceContract('MockGitService', async () => {
  const service = new MockGitService();
  service.write('a.txt', 'one\n');
  await service.stage(['a.txt']);
  await service.commit('init');
  return {
    service,
    write: (path, content) => {
      service.write(path, content);
      return Promise.resolve();
    },
  };
});
