import React from 'react';
import { Member } from '../../types';
import { motion } from 'motion/react';
import { CreditCard, Star, MapPin, Phone } from 'lucide-react';

interface Props {
  member: Member;
}

export default function MembershipCard({ member }: Props) {
  const isFOC = member.memberType === 'FOC';

  const formatExpirty = (expires: any) => {
    if (!expires) return isFOC ? 'Active FOC' : 'Permanent';
    const date = new Date(typeof expires === 'object' && expires.seconds ? expires.seconds * 1000 : expires);
    return date.toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' });
  };

  return (
    <div id={`membership-card-${member.memberId}`} className={`relative w-full max-w-sm aspect-[1.6/1] rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden group transition-all duration-500 scale-100 ${
      isFOC 
        ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-black border border-white/10 shadow-indigo-500/20' 
        : 'bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 shadow-indigo-200'
    }`}>
      {/* Decorative Elements */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 ${
        isFOC ? 'bg-indigo-500/20' : 'bg-white/10'
      }`} />
      <div className={`absolute -bottom-20 -left-20 w-60 h-60 rounded-full blur-2xl ${
        isFOC ? 'bg-slate-500/10' : 'bg-blue-400/20'
      }`} />
      
      <div className="relative h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 backdrop-blur-md rounded-xl flex items-center justify-center ${
              isFOC ? 'bg-indigo-600/30' : 'bg-white/20'
            }`}>
              {isFOC ? (
                <Star className="w-6 h-6 text-indigo-400 fill-indigo-400" />
              ) : (
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              )}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">
                {isFOC ? 'Staff Privilege' : 'Loyal Member'}
              </div>
              <div className="font-black text-lg tracking-tight leading-none uppercase">JNC Resto</div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
            isFOC ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10' : 'border-white/20 text-white/50'
          }`}>
            {member.memberType}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">Holder Name</div>
            <div className="text-xl font-bold tracking-tight uppercase truncate">{member.name}</div>
          </div>
          
          <div className="flex justify-between items-end">
            <div>
               <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">Identity ID</div>
               <div className="font-mono text-lg font-bold tracking-widest">{member.memberId}</div>
            </div>
            <div className="text-right">
               <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                 {isFOC ? 'Valid Thru' : 'Expires'}
               </div>
               <div className="text-xs font-bold uppercase tracking-widest">
                 {formatExpirty(member.expiresAt)}
               </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Texture accent */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
      {isFOC && (
        <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none">
          <div className="absolute top-4 -right-8 w-32 h-6 bg-indigo-600/30 backdrop-blur-md rotate-45 flex items-center justify-center text-[10px] font-black tracking-widest text-indigo-200">
            FOC
          </div>
        </div>
      )}
    </div>
  );
}
