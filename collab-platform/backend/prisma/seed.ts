import { PrismaClient, GlobalRole, ProjectRole, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@collab.dev',
      password: hashedPassword,
      name: 'Alex Admin',
      globalRole: GlobalRole.ADMIN,
    },
  });

  const pm = await prisma.user.create({
    data: {
      email: 'pm@collab.dev',
      password: hashedPassword,
      name: 'Priya Manager',
      globalRole: GlobalRole.PROJECT_MANAGER,
    },
  });

  const member1 = await prisma.user.create({
    data: {
      email: 'dev@collab.dev',
      password: hashedPassword,
      name: 'Sam Developer',
      globalRole: GlobalRole.TEAM_MEMBER,
    },
  });

  const member2 = await prisma.user.create({
    data: {
      email: 'dev2@collab.dev',
      password: hashedPassword,
      name: 'Jordan Coder',
      globalRole: GlobalRole.TEAM_MEMBER,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@collab.dev',
      password: hashedPassword,
      name: 'Val Viewer',
      globalRole: GlobalRole.VIEWER,
    },
  });

  console.log('✅ Users created');

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: 'E-Commerce Platform',
      description: 'Building a modern e-commerce platform with real-time inventory management.',
      members: {
        create: [
          { userId: pm.id, projectRole: ProjectRole.PROJECT_MANAGER },
          { userId: member1.id, projectRole: ProjectRole.TEAM_MEMBER },
          { userId: member2.id, projectRole: ProjectRole.TEAM_MEMBER },
          { userId: viewer.id, projectRole: ProjectRole.VIEWER },
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Redesign',
      description: 'Complete UI/UX overhaul of our flagship mobile application.',
      members: {
        create: [
          { userId: pm.id, projectRole: ProjectRole.PROJECT_MANAGER },
          { userId: member1.id, projectRole: ProjectRole.TEAM_MEMBER },
        ],
      },
    },
  });

  console.log('✅ Projects created');

  // Create tasks for project 1
  const task1 = await prisma.task.create({
    data: {
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      projectId: project1.id,
      creatorId: pm.id,
      assigneeId: member1.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Implement product catalog API',
      description: 'Create REST API endpoints for product management including CRUD operations.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      projectId: project1.id,
      creatorId: pm.id,
      assigneeId: member1.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Design checkout flow',
      description: 'Wireframe and implement the multi-step checkout process.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      projectId: project1.id,
      creatorId: pm.id,
      assigneeId: member2.id,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: 'Payment gateway integration',
      description: 'Integrate Stripe for payment processing.',
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      projectId: project1.id,
      creatorId: pm.id,
    },
  });

  const task5 = await prisma.task.create({
    data: {
      title: 'Performance optimization',
      description: 'Optimize database queries and implement caching.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      projectId: project1.id,
      creatorId: pm.id,
      assigneeId: member2.id,
    },
  });

  // Tasks for project 2
  const task6 = await prisma.task.create({
    data: {
      title: 'User research and personas',
      description: 'Conduct user interviews and create persona documents.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      projectId: project2.id,
      creatorId: pm.id,
      assigneeId: member1.id,
    },
  });

  const task7 = await prisma.task.create({
    data: {
      title: 'Design system setup',
      description: 'Create a component library based on new design language.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      projectId: project2.id,
      creatorId: pm.id,
      assigneeId: member1.id,
    },
  });

  console.log('✅ Tasks created');

  // Create comments
  await prisma.comment.createMany({
    data: [
      { taskId: task2.id, authorId: member1.id, content: 'Started working on the products endpoint. Should have a draft ready by EOD.' },
      { taskId: task2.id, authorId: pm.id, content: 'Great! Don\'t forget to add pagination and filtering.' },
      { taskId: task2.id, authorId: member1.id, content: 'Will do. Adding cursor-based pagination for better performance.' },
      { taskId: task5.id, authorId: member2.id, content: 'Redis caching implemented. Query times down by 60%.' },
      { taskId: task5.id, authorId: pm.id, content: 'Excellent work! Please document the cache invalidation strategy.' },
    ],
  });

  console.log('✅ Comments created');

  // Create activity logs
  await prisma.activityLog.createMany({
    data: [
      { userId: pm.id, projectId: project1.id, action: 'project_created', entityType: 'project', entityId: project1.id, metadata: { name: project1.name } },
      { userId: pm.id, projectId: project1.id, action: 'task_created', entityType: 'task', entityId: task1.id, metadata: { title: task1.title } },
      { userId: pm.id, projectId: project1.id, action: 'task_assigned', entityType: 'task', entityId: task1.id, metadata: { assigneeId: member1.id } },
      { userId: member1.id, projectId: project1.id, action: 'task_status_changed', entityType: 'task', entityId: task1.id, metadata: { from: 'TODO', to: 'DONE' } },
      { userId: pm.id, projectId: project2.id, action: 'project_created', entityType: 'project', entityId: project2.id, metadata: { name: project2.name } },
    ],
  });

  console.log('✅ Activity logs created');

  console.log('\n🎉 Seed complete! Login credentials (all use password: Admin@123):');
  console.log('   👑 Admin:          admin@collab.dev');
  console.log('   📋 Project Manager: pm@collab.dev');
  console.log('   💻 Team Member:    dev@collab.dev');
  console.log('   💻 Team Member 2:  dev2@collab.dev');
  console.log('   👁️  Viewer:         viewer@collab.dev');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
