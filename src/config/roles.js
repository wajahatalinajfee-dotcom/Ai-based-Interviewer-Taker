export const ROLES = {
  basics: { name: 'Programming Basics (JavaScript)', topics: [
    ['variables and data types', 'operators', 'if/else conditions', 'loops', 'function basics', 'arrays and strings'],
    ['array methods', 'objects', 'scope', 'string methods', 'parameters and return values', 'common errors'],
    ['closures', 'the this keyword', 'error handling', 'async basics', 'basic OOP', 'method chaining'],
    ['edge cases', 'time complexity', 'clean code trade-offs', 'event loop', 'immutability', 'references and memory']] },
  mern: { name: 'MERN Developer', topics: [
    ['what MERN is', 'JSON and REST basics', 'React components and props', 'Node basics', 'MongoDB documents'],
    ['Express routing', 'React state', 'MongoDB CRUD', 'npm and modules', 'async/await'],
    ['React hooks', 'Express middleware', 'JWT auth', 'Mongo schema design and indexes', 'Node event loop'],
    ['aggregation pipelines', 'React performance', 'API security', 'scaling Node', 'testing and deployment', 'REST API design']] },
  mean: { name: 'MEAN Developer', topics: [
    ['what MEAN is', 'Angular components', 'TypeScript basics', 'Node basics', 'MongoDB documents'],
    ['Angular templates and directives', 'services and DI', 'Express routing', 'Mongo CRUD', 'Angular routing'],
    ['RxJS observables', 'Angular forms', 'JWT auth', 'Express middleware', 'Mongo schema design'],
    ['change detection', 'RxJS operators', 'state management', 'scaling and security', 'testing and deployment', 'lazy loading']] },
  ai: { name: 'AI Developer', topics: [
    ['what AI and ML are', 'supervised vs unsupervised', 'what an LLM is', 'tokens', 'prompting basics'],
    ['overfitting', 'evaluation metrics', 'embeddings', 'calling AI APIs', 'structured JSON output'],
    ['RAG', 'fine-tuning vs prompting', 'hallucination handling', 'vector search', 'prompt pipelines', 'evaluating LLM apps'],
    ['designing AI apps', 'cost and latency trade-offs', 'safety and responsible AI', 'monitoring', 'agents and tool use', 'scaling inference']] },
};
export const LEVELS = ['L1 Newbie', 'L2 Junior', 'L3 Mid', 'L4 Expert'];
export const TYPES = ['concept', 'scenario', 'debug', 'compare', 'output-prediction', 'what would you do if', 'fill-the-gap'];
export const FLAVORS = ['e-commerce', 'chat app', 'banking', 'school portal', 'food delivery', 'fitness tracker', 'booking system', 'news site'];

export const HR_TOPICS = ['teamwork', 'handling conflict', 'a failure and what you learned', 'taking initiative', 'meeting a tight deadline', 'learning something new quickly', 'receiving feedback', 'why you want this role'];
