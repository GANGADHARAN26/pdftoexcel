import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './mongodb';
import User from '../models/User';
import { connectToMongoDB } from './mongoose';

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === 'google') {
        try {
          await connectToMongoDB();
          
          // Check if user exists, if not create one
          let existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
            existingUser = await User.create({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: 'google',
            });
          }
          
          return true;
        } catch (error) {
          console.error('Error in signIn callback:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        try {
          await connectToMongoDB();
          const dbUser = await User.findOne({ email: session.user.email });
          
          if (dbUser) {
            session.user.id = dbUser._id.toString();
            session.user.isSubscribed = dbUser.isSubscribed;
            session.user.subscriptionStatus = dbUser.subscriptionStatus;
            session.user.usageStats = dbUser.usageStats;
          }
        } catch (error) {
          console.error('Error in session callback:', error);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
};

export default NextAuth(authOptions);