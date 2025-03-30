import React from 'react';
import {
    Chat,
    Channel,
    ChannelHeader,
    MessageList,
    MessageInput,
    Thread,
    Window,
} from 'stream-chat-react';
import { StreamChat } from 'stream-chat';
import 'stream-chat-react/dist/css/index.css';

interface ChatWindowProps {
    client: StreamChat;
    channel: any;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ client, channel }) => {
    return (
        <Chat client={client} theme="messaging light">
            <Channel channel={channel}>
                <Window>
                    <ChannelHeader />
                    <MessageList />
                    <MessageInput />
                </Window>
                <Thread />
            </Channel>
        </Chat>
    );
};
