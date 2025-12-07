import { useEffect, useRef, useState } from 'react';
import { init } from '@waline/client';
import type { WalineInstance } from '@waline/client';
import { WALINE_CONFIG } from './waline-config';

interface AuthManagerProps {
  onClose: () => void;
}

export const AuthManager = ({ onClose }: AuthManagerProps) => {
  const walineContainerRef = useRef<HTMLDivElement>(null);
  const walineInstanceRef = useRef<WalineInstance | null>(null);
  const [userNick, setUserNick] = useState<string>(''); // 改用昵称而不是邮箱

  // 初始化 Waline，使用原生登录和评论管理
  useEffect(() => {
    if (walineContainerRef.current && !walineInstanceRef.current) {
      walineInstanceRef.current = init({
        el: walineContainerRef.current,
        serverURL: WALINE_CONFIG.serverURL,
        path: WALINE_CONFIG.path,
        lang: WALINE_CONFIG.lang,
        login: 'enable', // 启用原生登录
        meta: ['nick', 'mail', 'link'],
        requiredMeta: ['nick'], // 只要求昵称，邮箱可选
        pageSize: 100,
        dark: false,
        commentSorting: 'latest',
        emoji: [
          '//unpkg.com/@waline/emojis@1.2.0/weibo',
          '//unpkg.com/@waline/emojis@1.2.0/bilibili',
        ],
        imageUploader: true,
        search: true, // 启用搜索功能（包括 GIF）
      });

      console.log('📋 已初始化 Waline 评论管理器（原生登录模式）');
      
      // 监听登录状态变化
      const checkLoginStatus = setInterval(() => {
        const userInfo = localStorage.getItem('WALINE_USER');
        if (userInfo) {
          try {
            const user = JSON.parse(userInfo);
            if (user.display_name && user.display_name !== userNick) {
              setUserNick(user.display_name);
              console.log('👤 检测到用户登录:', user.display_name);
              // 延迟一下再过滤，确保评论列表已加载
              setTimeout(() => filterComments(user.display_name), 1000);
            }
          } catch (e) {
            console.error('解析用户信息失败:', e);
          }
        }
      }, 500);

      return () => {
        clearInterval(checkLoginStatus);
      };
    }

    return () => {
      if (walineInstanceRef.current) {
        walineInstanceRef.current.destroy();
        walineInstanceRef.current = null;
      }
    };
  }, []);

  // 过滤评论：只显示自己发的和收到的回复
  const filterComments = (nick: string) => {
    if (!walineContainerRef.current || !nick) return;

    const allComments = walineContainerRef.current.querySelectorAll('.wl-card');
    let myCommentsCount = 0;
    let repliesCount = 0;
    
    console.log(`🔍 开始过滤评论，用户昵称: ${nick}, 总评论数: ${allComments.length}`);
    
    allComments.forEach((card) => {
      const cardElement = card as HTMLElement;
      let isMyComment = false;
      let isReplyToMe = false;
      
      // 方法 1: 从 Waline 数据对象获取
      const cardData = (cardElement as any).__waline_comment__;
      
      if (cardData && cardData.nick) {
        isMyComment = cardData.nick.trim() === nick.trim();
        
        if (!isMyComment) {
          // 检查是否回复自己
          const content = (cardData.orig || cardData.comment || '');
          isReplyToMe = content.includes(`@${nick}`);
        }
      } else {
        // 方法 2: 从 DOM 获取
        const nickElement = cardElement.querySelector('.wl-nick');
        const commentNick = nickElement?.textContent?.trim() || '';
        isMyComment = commentNick === nick.trim();
        
        if (!isMyComment) {
          const commentContent = cardElement.querySelector('.wl-content')?.textContent || '';
          isReplyToMe = commentContent.includes(`@${nick}`);
        }
      }
      
      if (isMyComment || isReplyToMe) {
        cardElement.style.display = '';
        if (isMyComment) myCommentsCount++;
        if (isReplyToMe) repliesCount++;
      } else {
        cardElement.style.display = 'none';
      }
    });

    console.log(`✅ 已过滤评论 - 我的评论: ${myCommentsCount}, 收到的回复: ${repliesCount}`);
  };

  // 当用户昵称变化时重新过滤
  useEffect(() => {
    if (userNick) {
      const timer = setInterval(() => {
        filterComments(userNick);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [userNick]);

  return (
    <div className="auth-modal">
      <div className="auth-modal__overlay" onClick={onClose} />
      <div className="auth-modal__content">
        <button className="auth-modal__close" onClick={onClose}>×</button>
        
        <h2>🎄 我的评论</h2>
        <p className="auth-modal__desc">登录后可以查看和管理你的祝福</p>
        
        {!userNick && (
          <div className="auth-login-hint">
            <div className="auth-login-hint__icon">🎅</div>
            <div className="auth-login-hint__title">请先登录</div>
            <div className="auth-login-hint__desc">
              登录后即可查看你发送的所有祝福和收到的回复。<br />
              请在下方 Waline 评论框中点击登录按钮。
            </div>
          </div>
        )}
        
        <div className="auth-waline-container" ref={walineContainerRef} />
      </div>
    </div>
  );
};
