import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm, mkdir, access } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const temp = await mkdtemp(path.join(os.tmpdir(), 'line-tone-ui-'))
const descriptor = path.join(temp, 'fixture.json')
const artifacts = path.join(root, 'test-results', 'ui')
await mkdir(artifacts, { recursive: true })
const python =
  process.env.FIXTURE_PYTHON || path.resolve(root, '../Backend/.venv/Scripts/python.exe')
let backend, vite, browser, metadata, page, assertNoCredentials
let stage = 'fixture-start'
console.log('UI stage:', stage)
const errors = []
const expectedDialogs = []
const requests = []
const steps = []
const journeyLinks = []
const questionRequests = []
const safeJson = (value, replacer = null, space = 2) => {
  let text = JSON.stringify(value, replacer, space)
  for (const secret of [metadata?.ownerToken, metadata?.otherToken, metadata?.providerKey].filter(
    Boolean,
  ))
    text = text.split(secret).join('[REDACTED]')
  return text
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const waitUntil = async (condition, label, timeout = 30000) => {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    if (await condition()) return
    await sleep(200)
  }
  throw new Error(`Timed out: ${label}`)
}
const stopProcess = async (child) => {
  if (child && child.exitCode === null) {
    child.kill()
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(5000)])
  }
}
try {
  backend = spawn(
    python,
    [
      path.join(root, 'scripts/backend_fixture.py'),
      '--descriptor',
      descriptor,
      '--backend',
      path.resolve(root, '../Backend'),
      '--public-base-url',
      'http://127.0.0.1:5179',
      '--max-seconds',
      '900',
    ],
    {
      cwd: root,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    },
  )
  let backendOutput = ''
  let startupError
  backend.on('error', (error) => {
    startupError = error
  })
  backend.stdout.on('data', (data) => {
    backendOutput += data
  })
  backend.stderr.on('data', (data) => {
    backendOutput += data
  })
  await waitUntil(async () => {
    if (startupError) throw new Error('Fixture startup failed: ' + startupError.message)
    if (backend.exitCode !== null)
      throw new Error(`Fixture exited before readiness: ${backendOutput.slice(-2000)}`)
    try {
      await access(descriptor)
      return true
    } catch {
      return false
    }
  }, 'fixture descriptor')
  metadata = JSON.parse(await readFile(descriptor, 'utf8'))
  vite = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      '5179',
      '--strictPort',
    ],
    {
      cwd: root,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        VITE_ENABLE_TEST_LOGIN: 'true',
        VITE_USE_MOCK: 'false',
        VITE_API_BASE_URL: '/v1',
        BACKEND_PROXY_TARGET: metadata.baseUrl,
      },
    },
  )
  vite.stdout.on('data', () => {})
  vite.stderr.on('data', () => {})
  await waitUntil(async () => {
    try {
      return (await fetch('http://127.0.0.1:5179/health')).ok
    } catch {
      return false
    }
  }, 'vite proxy')
  browser = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  })
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort()
    return route.continue()
  })
  page = await context.newPage()
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/v1/question-sets') {
      const body = request.postDataJSON()
      questionRequests.push({ count: body.count, task_id: body.task_id })
    }
  })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (url.pathname.startsWith('/v1/'))
      requests.push({
        method: response.request().method(),
        path: url.pathname,
        status: response.status(),
      })
  })
  page.on('dialog', (dialog) => {
    if (stage === 'upload-recovery') expectedDialogs.push(dialog.message())
    else errors.push(`dialog: ${dialog.message()}`)
    void dialog.dismiss()
  })
  assertNoCredentials = async () => {
    const html = await page.content()
    const values = await page
      .locator('input')
      .evaluateAll((inputs) => inputs.map((input) => input.value).join('\n'))
    const storage = await page.evaluate(() =>
      JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
    )
    for (const secret of [metadata.ownerToken, metadata.otherToken, metadata.providerKey]) {
      assert(!html.includes(secret) && !values.includes(secret), 'Secret appeared in DOM')
      assert(!storage.includes(secret), 'Secret appeared in browser storage')
    }
  }
  const snapshot = async (name) => {
    await assertNoCredentials()
    await page.screenshot({ path: path.join(artifacts, name + '.png'), fullPage: true })
    steps.push(name)
  }
  stage = 'login'
  console.log('UI stage:', stage)
  await page.goto('http://127.0.0.1:5179/upload')
  await page.locator('#test-token').fill(metadata.ownerToken)
  await page.getByRole('button', { name: '테스트 인증 확인', exact: true }).click()
  await page.getByRole('button', { name: '사용 가능한 모델 불러오기', exact: true }).click()
  await page.locator('#model').selectOption(metadata.modelId)
  await page.locator('#provider-key').fill(metadata.providerKey)
  await page.getByRole('button', { name: '키 검증', exact: true }).click()
  await page.getByText('키 검증이 완료됐어요.', { exact: true }).waitFor()
  assert.equal(await page.locator('#provider-key').inputValue(), '')
  await snapshot('01-auth-ai-configured')
  await page.getByRole('button', { name: '계속하기', exact: true }).click()
  stage = 'upload'
  console.log('UI stage:', stage)
  await page.locator('input[type=file]').setInputFiles({
    name: 'momentum.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'Momentum is conserved when the net external force is zero. External forces change the total momentum of a system. A collision without external forces conserves total momentum.',
    ),
  })
  await page.getByRole('button', { name: '파일 업로드하기', exact: true }).click()
  await page.waitForURL('**/upload/exam', { timeout: 30000 })
  const tomorrow = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  await page.locator('input[type=date]').fill(tomorrow)
  await page
    .getByRole('button', { name: '시험 선택하고 개념 확인', exact: true })
    .click({ timeout: 30000 })
  await page.waitForURL('**/concepts')
  stage = 'concepts'
  console.log('UI stage:', stage)
  await page
    .getByRole('button', { name: '확정하고 코스 만들기', exact: true })
    .click({ timeout: 30000 })
  await page.waitForURL('**/today')
  stage = 'today'
  console.log('UI stage:', stage)
  await page
    .getByRole('link')
    .filter({ hasText: '학습' })
    .first()
    .waitFor({ timeout: 10000 })
    .catch(() => {})
  await snapshot('03-plan-created')
  // Delay a genuine plan response to exercise cached material + pending plan identity.
  await page.route('**/v1/study-plans/*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    await sleep(1000)
    await route.fulfill({ response })
  })
  steps.push('real-plan-response-delayed')
  const unitHref = await page.locator('a[href^="/unit"]').first().getAttribute('href')
  const unitContext = new URL(unitHref, page.url())
  const expectedTask = unitContext.searchParams.get('task')
  const expectedPlan = unitContext.searchParams.get('plan')
  assert(expectedTask && expectedPlan, 'Today unit card lost plan/task')
  journeyLinks.push({ label: 'Today unit card', href: unitHref })
  await page.locator('a[href^="/unit"]').first().click()
  const learnLink = page.locator('a[href^="/learn"]').first()
  await learnLink.waitFor()
  const learnHref = await learnLink.getAttribute('href')
  journeyLinks.push({ label: '이어서 배우기', href: learnHref })
  assert.equal(new URL(learnHref, page.url()).searchParams.get('task'), expectedTask)
  assert.equal(new URL(learnHref, page.url()).searchParams.get('plan'), expectedPlan)
  await learnLink.click()
  stage = 'learn'
  console.log('UI stage:', stage)
  await page.getByRole('button', { name: 'AI 자습 설명 생성', exact: true }).click()
  await page
    .getByText('Total momentum stays constant without external force.', { exact: false })
    .waitFor({ timeout: 30000 })
  await snapshot('04-grounded-learning')
  const quizLink = page.locator('a[href^="/quiz"]').first()
  const quizHref = await quizLink.getAttribute('href')
  journeyLinks.push({ label: '문제로 확인하기', href: quizHref })
  assert.equal(new URL(quizHref, page.url()).searchParams.get('task'), expectedTask)
  assert.equal(new URL(quizHref, page.url()).searchParams.get('plan'), expectedPlan)
  await quizLink.click()
  journeyLinks.push({ label: 'Final quiz URL', href: page.url() })
  stage = 'quiz-create'
  console.log('UI stage:', stage)
  await page.getByText('계획에 연결된 문제', { exact: true }).waitFor()
  assert.equal(await page.getByText(/^\d+문제$/, { exact: true }).innerText(), '5문제')
  await page.getByRole('button', { name: 'AI 문제 만들기', exact: true }).click()
  await page.waitForURL('**/quiz/solve**', { timeout: 30000 })
  assert.deepEqual(questionRequests, [{ count: 5, task_id: expectedTask }])
  stage = 'quiz-solve'
  console.log('UI stage:', stage)
  await page.getByPlaceholder('답을 입력해 주세요').waitFor({ timeout: 30000 })
  await snapshot('05-server-question')
  let answered = 0
  while (new URL(page.url()).pathname === '/quiz/solve' && answered < 20) {
    await page
      .getByPlaceholder('답을 입력해 주세요')
      .fill(answered === 0 ? 'Always' : 'When total external force is zero')
    await page.getByRole('button', { name: '제출', exact: true }).click()
    const next = page.getByRole('button', { name: /^(다음 문제|결과 보기)$/ })
    await next.click({ timeout: 30000 })
    answered++
  }
  await page.waitForURL('**/quiz/result**')
  stage = 'quiz-result'
  console.log('UI stage:', stage)
  await snapshot('06-server-graded-result')
  await page.getByRole('link', { name: '개념 설명하러 가기', exact: true }).click()
  stage = 'teach-prepare'
  console.log('UI stage:', stage)
  await snapshot('07-teach-prepare')
  await page.getByRole('button', { name: '설명 시작하기', exact: true }).click()
  const textOnly = page.getByRole('button', { name: '글로만 할게요', exact: true })
  await textOnly.waitFor({ timeout: 3000 }).catch(() => {})
  if (await textOnly.isVisible()) await textOnly.click()
  await page.waitForURL('**/teach?**')
  stage = 'teach-chat'
  console.log('UI stage:', stage)
  const ttsOff = page.getByRole('button', { name: '학생 질문 음성 끄기', exact: true })
  if (await ttsOff.isVisible()) await ttsOff.click()
  for (let round = 0; round < 3; round++) {
    await page
      .locator('textarea')
      .fill(
        'Momentum is conserved when the total external force is zero. Explanation round ' +
          (round + 1),
      )
    await page.getByRole('button', { name: '보내기', exact: true }).click()
    await waitUntil(
      async () =>
        (await page
          .getByText('Why must the total external force be zero?', { exact: true })
          .count()) ===
        round + 1,
      'assistant question round ' + (round + 1),
      30000,
    )
  }
  await page
    .locator('textarea')
    .fill('Final answer: zero total external force conserves total momentum.')
  await page.getByRole('button', { name: '보내기', exact: true }).click()
  await page
    .getByText('마지막 답변을 저장했어요. 설명 마치기를 눌러 리포트를 만들어 주세요.', {
      exact: true,
    })
    .waitFor()
  await snapshot('08-teach-conversation')
  await page.getByRole('button', { name: '설명 마치기', exact: true }).click()
  await page.getByRole('button', { name: '설명 마치기', exact: true }).last().click()
  await page.waitForURL('**/teach/analyzing**')
  stage = 'report'
  console.log('UI stage:', stage)
  await page.getByRole('button', { name: '리포트 만들기', exact: true }).click()
  await page.waitForURL('**/report?**', { timeout: 30000 })
  await page
    .getByText('The external force condition was stated in the explanation.', { exact: true })
    .waitFor({ timeout: 30000 })
  await snapshot('09-grounded-report')
  await page.locator('a[href^="/source"]').first().click()
  await page.waitForURL('**/source?**')
  await page
    .getByText('Momentum is conserved when the net external force is zero.', { exact: false })
    .first()
    .waitFor()
  await snapshot('09b-authoritative-report-source')
  await page.goBack()
  await page
    .getByText('The external force condition was stated in the explanation.', { exact: true })
    .waitFor()
  const reportUrl = page.url()
  const reportPosts = requests.filter(
    (r) => r.method === 'POST' && r.path.endsWith('/complete'),
  ).length
  await page.getByRole('link', { name: '부족한 부분 재학습', exact: true }).click()
  await page.waitForURL('**/review?**')
  await snapshot('10-grounded-review')
  const reviewPatch = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      /\/v1\/plan-tasks\//.test(response.url()) &&
      response.status() === 200,
  )
  await page.getByRole('button', { name: '복습 완료로 표시', exact: true }).click()
  await reviewPatch
  steps.push('10b-plan-linked-review-completed')
  await page.goBack()
  await page
    .getByText('The external force condition was stated in the explanation.', { exact: true })
    .waitFor()
  assert.equal(
    requests.filter((r) => r.method === 'POST' && r.path.endsWith('/complete')).length,
    reportPosts,
  )
  stage = 'reload-and-records'
  console.log('UI stage:', stage)
  await page.reload()
  await page.locator('#test-token').waitFor()
  await page.locator('#test-token').fill(metadata.ownerToken)
  await page.getByRole('button', { name: '테스트 인증 확인', exact: true }).click()
  await page.getByRole('button', { name: '계속하기', exact: true }).click()
  await page.waitForURL(reportUrl)
  await page
    .getByText('The external force condition was stated in the explanation.', { exact: true })
    .waitFor()
  await snapshot('11-report-after-reauth')
  await page.goto('http://127.0.0.1:5179/records')
  await page.locator('#test-token').fill(metadata.ownerToken)
  await page.getByRole('button', { name: '테스트 인증 확인', exact: true }).click()
  await page.getByRole('button', { name: '계속하기', exact: true }).click()
  await page.waitForURL('**/records')
  await page.getByText('Momentum conservation', { exact: false }).first().waitFor()
  await snapshot('12-server-records')
  stage = 'account-isolation'
  console.log('UI stage:', stage)
  await page.getByRole('link', { name: '프로필·설정', exact: true }).click()
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await page.goto('http://127.0.0.1:5179/records')
  await page.locator('#test-token').fill(metadata.otherToken)
  await page.getByRole('button', { name: '테스트 인증 확인', exact: true }).click()
  await page.getByRole('button', { name: '계속하기', exact: true }).click()
  await page.waitForURL('**/records')
  await page.getByText('Momentum conservation', { exact: false }).waitFor({ state: 'hidden' })
  await snapshot('13-other-account-isolated')
  assert.equal(
    requests.filter((r) => r.method === 'POST' && r.path.endsWith('/messages')).length,
    3,
  )
  assert.equal(
    requests.filter((r) => r.method === 'POST' && r.path.endsWith('/final-answer')).length,
    1,
  )
  assert.equal(
    requests.filter((r) => r.method === 'POST' && /\/questions\/[^/]+\/attempts$/.test(r.path))
      .length,
    5,
  )
  assert.equal(errors.length, 0)
  stage = 'cold-route-smoke'
  console.log('UI stage:', stage)
  const routes = [
    '/today',
    '/plan',
    '/unit',
    '/learn',
    '/quiz',
    '/quiz/solve',
    '/quiz/result',
    '/teach/prepare',
    '/teach',
    '/teach/analyzing',
    '/report',
    '/review',
    '/records',
    '/source',
    '/materials',
    '/upload/exam',
    '/concepts',
    '/settings/account',
    '/profile',
  ]
  for (const route of routes) {
    await page.evaluate(async (destination) => {
      const { router } = await import('/src/router.jsx')
      await router.navigate(destination)
    }, route)
    await page.waitForURL('**' + route)
    await page.waitForTimeout(350)
    const text = await page.locator('body').innerText()
    assert(!text.includes('Unexpected Application Error!'), 'Cold render crashed: ' + route)
    assert(!text.includes('Momentum conservation'), 'Previous account data leaked: ' + route)
    steps.push('cold:' + route)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(async () => {
    const { router } = await import('/src/router.jsx')
    await router.navigate('/today')
  })
  await page.waitForTimeout(300)
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    'Mobile horizontal overflow',
  )
  await snapshot('14-mobile-empty-account')
  assert.equal(errors.length, 0)
  stage = 'upload-recovery'
  console.log('UI stage:', stage)
  await page.setViewportSize({ width: 1100, height: 900 })
  // Route setup only; the faulted upload and recovery below use real visible UI controls.
  await page.evaluate(async () => {
    const { router } = await import('/src/router.jsx')
    await router.navigate('/login?next=/upload')
  })
  await page.getByRole('button', { name: '사용 가능한 모델 불러오기', exact: true }).click()
  await page.locator('#model').selectOption(metadata.modelId)
  await page.locator('#provider-key').fill(metadata.providerKey)
  await page.getByRole('button', { name: '키 검증', exact: true }).click()
  await page.getByText('키 검증이 완료됐어요.', { exact: true }).waitFor()
  await page.getByRole('button', { name: '계속하기', exact: true }).click()
  const createdBefore = requests.filter(
    (r) => r.method === 'POST' && r.path === '/v1/materials',
  ).length
  let completionCalls = 0
  let originalJobId, originalKey
  const reconciledJobs = []
  page.on('response', async (response) => {
    const pathname = new URL(response.url()).pathname
    if (
      response.request().method() === 'GET' &&
      /^\/v1\/materials\/[^/]+$/.test(pathname) &&
      response.status() === 200
    ) {
      try {
        const body = await response.json()
        if (body.data.latest_job_id) reconciledJobs.push(body.data.latest_job_id)
      } catch {
        /* Navigation may close a response body. */
      }
    }
  })
  await page.route('**/v1/materials/*/complete', async (route) => {
    completionCalls++
    const key = route.request().headers()['idempotency-key']
    const response = await route.fetch()
    assert.equal(response.status(), 202)
    const body = await response.json()
    if (completionCalls === 1) {
      originalJobId = body.data.job.id
      originalKey = key
      // Backend has genuinely committed; only response delivery is lost.
      await route.abort('failed')
    } else {
      assert.equal(body.data.job.id, originalJobId, 'Recovery created a second job')
      assert.equal(key, originalKey, 'Recovery changed idempotency key')
      await route.fulfill({ response })
    }
  })
  await page.locator('input[type=file]').setInputFiles({
    name: 'recovery.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'Momentum is conserved when total external force is zero. This is a separate synthetic recovery test.',
    ),
  })
  await page.getByRole('button', { name: '파일 업로드하기', exact: true }).click({ clickCount: 2 })
  await page.getByRole('button', { name: '업로드 결과 확인 / 이어서 진행', exact: true }).waitFor()
  assert.equal(completionCalls, 1, 'Repeated click issued another complete request')
  await page.getByRole('link', { name: '내 자료에서 확인', exact: true }).click()
  await page.waitForURL('**/materials')
  await page.goBack()
  await page.getByRole('button', { name: '업로드 결과 확인 / 이어서 진행', exact: true }).click()
  await page.waitForURL('**/upload/exam')
  await waitUntil(
    async () => reconciledJobs.includes(originalJobId),
    'original accepted job reconciled by read',
  )
  assert.equal(completionCalls, 1, 'Reconciliation unnecessarily repeated completion')
  await page.getByText('파일 업로드 후', { exact: false }).waitFor()
  assert.equal(
    requests.filter((r) => r.method === 'POST' && r.path === '/v1/materials').length,
    createdBefore + 1,
  )
  await page.unroute('**/v1/materials/*/complete')
  await snapshot('15-lost-complete-recovered')
  assert.equal(errors.length, 0)
  stage = 'completed'
  console.log('UI stage:', stage)
  await writeFile(
    path.join(artifacts, 'stage-inspection.json'),
    safeJson(
      { stage, url: page.url(), text: await page.locator('body').innerText(), requests, errors },
      null,
      2,
    ),
  )
  console.log(
    safeJson({
      stage,
      steps,
      errors,
      artifacts,
    }),
  )
} catch (error) {
  process.exitCode = 1
  if (page && !page.isClosed() && assertNoCredentials) {
    try {
      await assertNoCredentials()
      await writeFile(
        path.join(artifacts, 'failure-text.json'),
        safeJson({ text: await page.locator('body').innerText() }),
      )
      await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true })
    } catch {
      /* Never capture credential entry or a closed browser. */
    }
  }
  console.error(
    safeJson({
      stage,
      failure: error.message,
      journeyLinks,
      questionRequests,
      requests: requests.slice(-15),
      errors,
    }),
  )
} finally {
  if (browser) await browser.close().catch(() => {})
  await stopProcess(vite)
  if (metadata) {
    await writeFile(metadata.stopFile, 'stop')
    await waitUntil(async () => backend.exitCode !== null, 'fixture stop', 10000).catch(() => {})
  }
  await stopProcess(backend)
  let fixtureSummary
  try {
    fixtureSummary = JSON.parse(
      await readFile(descriptor.replace('.json', '.summary.json'), 'utf8'),
    )
    await writeFile(path.join(artifacts, 'fixture-summary.json'), safeJson(fixtureSummary))
    if (!fixtureSummary.clean_shutdown) process.exitCode = 1
    if (stage === 'completed' && fixtureSummary.provider_calls?.grade !== 5) process.exitCode = 1
    if (stage === 'completed' && fixtureSummary.provider_calls?.analysis !== 2) process.exitCode = 1
  } catch {
    process.exitCode = 1
  }
  await writeFile(
    path.join(artifacts, 'summary.json'),
    safeJson({
      stage,
      steps,
      errors,
      expectedDialogs,
      requests,
      journeyLinks,
      questionRequests,
      fixture: fixtureSummary,
      success: !process.exitCode,
    }),
  )
  await rm(temp, { recursive: true, force: true })
}
