import { db } from './app/lib/db.server.ts';

async function deleteAllComments() {
  try {
    const result = await db.comment.deleteMany();
    console.log(`Deleted ${result.count} comments`);
    await db.post.updateMany({
      data: { commentCount: 0 }
    });
    console.log('Reset all post comment counts to 0');
  } catch (error) {
    console.error('Error deleting comments:', error);
  } finally {
    await db.$disconnect();
  }
}

deleteAllComments();
