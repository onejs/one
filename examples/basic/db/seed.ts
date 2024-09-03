import { db } from './connection'
import { users, posts, follows, likes, reposts, replies } from './schema'
import { faker } from '@faker-js/faker'

const userNames = [
  'SomeRandomDevWeb',
  'Floren Ryance',
  'PrimeRageN',
  'bramadov 22',
  'CodeWarrior',
  'RustEvangelist',
  'AdrenalineCoder',
  'JSFrameworkFanatic',
  'DebuggingDetective',
  'VimGuru',
  'DuckDebugger',
  'ChangeChampion',
  // Additional names to reach 100 users
  'ByteMaster',
  'SyntaxSage',
  'DevNinja',
  'BugHunter',
  'PixelPioneer',
  'DataDiva',
  'CloudCrusader',
  'APIWizard',
  'GitGuru',
  'FrontEndPhenom',
  'BackEndBoss',
  'FullStackFanatic',
  'AIEnthusiast',
  'BlockchainBeliver',
  'CSSWizard',
  'DevOpsDestroyer',
  'DatabaseDiva',
  'SecuritySage',
  'UXUnicorn',
  'MobileMaestro',
  'CloudCommander',
  'MLMaverick',
  'IoTInnovator',
  'ScalabilityScientist',
  'AgileAdvocate',
  'CodeClinic',
  'BugBountyHunter',
  'PenTesterPro',
  'EthicalHacker',
  'DataScientist',
  'QuantumCoder',
  'RoboticsRenegade',
  'VRVirtuoso',
  'ARArchitect',
  'GameDevGuru',
  'CryptoCodeCracker',
  'JavaJedi',
  'PythonPioneer',
  'RubyRockstar',
  'GoGopher',
  'SwiftSavant',
  'KotlinKing',
  'TypeScriptTitan',
  'PHPPhenom',
  'CSharpChampion',
  'ScalaScientist',
  'RustRenegade',
  'ClojureCleric',
  'HaskellHero',
  'ElixirExpert',
  'DartDeveloper',
  'LuaLuminary',
  'JuliaJuggler',
  'ErlangEngineer',
  'FortranFanatic',
  'COBOLCoder',
  'AssemblyAce',
  'BrainfuckBoss',
  'SQLSorcerer',
  'NoSQLNinja',
  'GraphQLGuru',
  'RESTfulRanger',
  'WebSocketWizard',
  'OAuth2Oracle',
  'JWTJedi',
  'DockerDiva',
  'KubernetesKing',
  'TerraformTitan',
  'AnsibleAce',
  'JenkinsGenius',
  'GitLabGladiator',
  'CircleCISage',
  'TravisTrooper',
  'SonarQubeSorcerer',
  'SeleniumSensei',
  'CypressChampion',
  'JestJuggler',
  'MochaMatador',
  'KarmaKing',
  'WebpackWarrior',
  'GulpGladiator',
  'GruntGuru',
  'NPMNinja',
  'YarnYogi',
  'BabelBoss',
  'ESLintExpert',
  'PrettierPro',
  'StylelintStar',
  'SassySorcerer',
  'LessLegend',
]

type Topic = {
  subject: string
  quirk: string
}

const topics: Topic[] = [
  {
    subject: 'Responsive design',
    quirk: 'spending more time adjusting margins than coding actual features',
  },
  { subject: 'AI-driven development', quirk: 'realizing the AI writes better comments than I do' },
  {
    subject: 'Cross-browser compatibility',
    quirk: 'feeling nostalgic for the days when we only had to support one browser',
  },
  { subject: 'React', quirk: 'creating 47 components for a simple landing page' },
  { subject: 'Dark mode', quirk: 'accidentally designing for light mode at 3 AM' },
  {
    subject: 'Progressive Web Apps',
    quirk: "explaining to my mom that it's not a 'real' app, but also not just a website",
  },
  {
    subject: 'Cross-platform development',
    quirk: 'celebrating when it works on two platforms out of five',
  },
  {
    subject: 'Serverless architecture',
    quirk: 'missing the days when I could blame the server for everything',
  },
  {
    subject: 'Content personalization',
    quirk: 'realizing the algorithm knows me better than I know myself',
  },
  {
    subject: 'Voice search optimization',
    quirk: "talking to my code hoping it'll understand me better",
  },
  { subject: 'JavaScript frameworks', quirk: 'learning a new one every time I start a project' },
  { subject: 'CSS-in-JS', quirk: 'forgetting where I put that one crucial style' },
  { subject: 'WebAssembly', quirk: 'pretending I understand how it works' },
  {
    subject: 'Microservices',
    quirk: 'drawing so many boxes and arrows that my architecture diagram looks like abstract art',
  },
  { subject: 'GraphQL', quirk: 'over-fetching data out of habit anyway' },
  {
    subject: 'Agile development',
    quirk: "turning 'it's not a bug, it's a feature' into a lifestyle",
  },
  {
    subject: 'TypeScript',
    quirk: 'feeling smug about catching a type error, then spending hours fixing it',
  },
  { subject: 'Web3', quirk: 'nodding along in meetings while secretly Googling what it means' },
  {
    subject: 'Low-code platforms',
    quirk: 'spending more time customizing than I would have spent coding',
  },
  { subject: 'Code reviews', quirk: 'leaving comments on my own PR because no one else will' },
]

const formats: string[] = [
  "Embracing {subject} means {quirk}. It's not much, but it's honest work. {hashtag}",
  "They said {subject} would be fun. They didn't mention {quirk}. Still, I'm having a blast! {hashtag}",
  'My love letter to {subject}: Roses are red, violets are blue, {quirk}, and I still love you. {hashtag}',
  'Day 47 of {subject}: {quirk}. Send help... or coffee. {hashtag}',
  'Pro tip: Master {subject} by {quirk}. Works 60% of the time, every time. {hashtag}',
  'In my {subject} era: {quirk} and loving every minute of it. {hashtag}',
  "Confession: I thought {subject} would cure my imposter syndrome. Now I'm just {quirk}. Progress? {hashtag}",
  '{subject} has taught me that {quirk} is a valuable life skill. Thanks, I guess? {hashtag}',
  'My {subject} journey: 10% inspiration, 90% {quirk}. {hashtag}',
  "Plot twist: {subject} isn't about coding, it's about {quirk}. Mind blown. {hashtag}",
  'Dear future self, remember when {subject} meant {quirk}? Good times. {hashtag}',
  'Breaking: Local developer finds joy in {subject}. Sources confirm {quirk} is involved. {hashtag}',
  "To all my {subject} folks out there {quirk}, you're not alone. We're in this together! {hashtag}",
  'TIL that {subject} is less about syntax and more about {quirk}. The more you know! {hashtag}',
  "Me: I'm a {subject} expert. Also me: {quirk}. Fake it till you make it, right? {hashtag}",
]

const hashtags: string[] = [
  '#WebDevLife',
  '#CodeHumor',
  '#DevProblems',
  '#ProgrammerHumor',
  '#TechLife',
  '#DeveloperProblems',
  '#CodeNewbie',
  '#SoftwareEngineering',
  '#WebDevelopment',
  '#DevJokes',
]

const replyTemplates = [
  'Have you tried turning it off and on again? #TechSupport101',
  "Ah, I see you've played {subject}y-spoon before!",
  "This is why we can't have nice things in {subject}.",
  'I feel personally attacked by this relatable {subject} content.',
  '{quirk}? Story of my life! #DeveloperProblems',
  "I'm in this tweet and I don't like it. #TooReal",
  'Plot twist: {quirk} is actually a feature, not a bug!',
  'Wait, you guys are getting {subject} to work?',
  'Me, reading about {subject}: I know some of these words!',
  '*Laughs nervously in {subject}*',
  'Bold of you to assume I understand {subject} at all.',
  '{quirk} is my middle name! ...Unfortunately.',
  'Ah yes, {subject}, my old nemesis, we meet again.',
  'This tweet is brought to you by {quirk} gang.',
  "I didn't choose the {subject} life, the {subject} life chose me.",
]

function generatePostContent(topic: Topic): string {
  const format = formats[Math.floor(Math.random() * formats.length)]
  const hashtag = hashtags[Math.floor(Math.random() * hashtags.length)]

  return format
    .replace('{subject}', topic.subject)
    .replace('{quirk}', topic.quirk)
    .replace('{hashtag}', hashtag)
}

function generateReply(topic: Topic): string {
  const template = replyTemplates[Math.floor(Math.random() * replyTemplates.length)]

  return template.replace('{subject}', topic.subject).replace('{quirk}', topic.quirk)
}

const seed = async () => {
  try {
    console.info('Starting the seeding process...')

    // Clear existing data
    console.info('Clearing existing data...')
    await db.delete(replies)
    await db.delete(reposts)
    await db.delete(likes)
    await db.delete(follows)
    await db.delete(posts)
    await db.delete(users)
    console.info('Existing data cleared.')

    // Insert users and return their IDs
    console.info('Generating 100 users with predefined names...')
    const userIds: { id: number }[] = await db
      .insert(users)
      .values(
        userNames.map((name) => ({
          username: name,
          email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          passwordHash: faker.internet.password(),
          avatarUrl: `https://i.pravatar.cc/150?u=${name}`,
        }))
      )
      .returning({ id: users.id })
    console.info('100 users generated.')

    // Insert posts and replies
    console.info('Generating 10 posts for each user and replies...')
    const postAndReplyPromises = userIds.flatMap((user) => {
      console.info(`Generating 10 posts for user ${user.id}`)
      return Array.from({ length: 10 }).map(async () => {
        const topic = topics[Math.floor(Math.random() * topics.length)]
        const postContent = generatePostContent(topic)

        // Insert post
        const [insertedPost] = await db
          .insert(posts)
          .values({
            userId: user.id,
            content: postContent,
            createdAt: faker.date.recent({ days: 1 }),
          })
          .returning({ id: posts.id })

        // Generate and insert replies
        const replyCount = Math.floor(Math.random() * 5) + 1 // 1 to 5 replies per post
        const replyPromises = Array.from({ length: replyCount }).map(() => {
          const replyingUser = userIds[Math.floor(Math.random() * userIds.length)]
          return db.insert(replies).values({
            userId: replyingUser.id,
            postId: insertedPost.id,
            content: generateReply(topic),
            createdAt: faker.date.recent({ days: 1 }),
          })
        })

        await Promise.all(replyPromises)
      })
    })

    await Promise.all(postAndReplyPromises)
    console.info('Posts and replies generated.')

    // Fetch all post IDs
    console.info('Fetching all post IDs...')
    const allPostIds: { id: number; userId: number }[] = await db
      .select({ id: posts.id, userId: posts.userId })
      .from(posts)

    // Insert follows
    console.info('Each user follows 10 other users...')
    const followPromises = userIds.flatMap((follower) => {
      const followingIds = faker.helpers.arrayElements(userIds, 10)
      console.info(`User ${follower.id} follows ${followingIds.length} users`)
      return followingIds.map((following) => {
        return db.insert(follows).values({
          followerId: follower.id,
          followingId: following.id,
          createdAt: faker.date.recent({ days: 1 }),
        })
      })
    })

    await Promise.all(followPromises)
    console.info('Follows inserted.')

    // Insert likes
    console.info('Each user likes 150 random posts...')
    const likePromises = userIds.flatMap((user) => {
      const shuffledPostIds = faker.helpers.shuffle(allPostIds)
      const postIds = shuffledPostIds.slice(0, 150)
      console.info(`User ${user.id} likes ${postIds.length} posts`)
      return postIds.map((post) => {
        return db.insert(likes).values({
          userId: user.id,
          postId: post.id,
          createdAt: faker.date.recent({ days: 1 }),
        })
      })
    })

    await Promise.all(likePromises)
    console.info('Likes inserted.')

    // Insert reposts
    console.info('Each user reposts 10 random posts...')
    const repostPromises = userIds.flatMap((user) => {
      const shuffledPostIds = faker.helpers.shuffle(allPostIds)
      const postIds = shuffledPostIds.filter((post) => post.userId !== user.id).slice(0, 10)
      console.info(`User ${user.id} reposts ${postIds.length} posts`)
      return postIds.map((post) => {
        console.info(`User ${user.id} reposts post ${post.id}`)
        return db.insert(reposts).values({
          userId: user.id,
          postId: post.id,
          createdAt: faker.date.recent({ days: 1 }),
        })
      })
    })

    await Promise.all(repostPromises)
    console.info('Reposts inserted.')

    console.info('Seeding completed successfully.')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding data:', error)
    process.exit(1)
  }
}

seed()
