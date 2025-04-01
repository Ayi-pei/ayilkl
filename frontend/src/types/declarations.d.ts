// 为缺少类型定义的模块创建声明文件
declare module 'emoji-picker-react' {
    const content: any;
    export default content;
}

declare module 'react-qrcode-logo' {
    const content: any;
    export default content;
}

// 为React添加类型声明
import type { ModalFuncProps, ButtonProps, ModalProps, FormProps } from 'antd';
import type { RcFile, UploadProps } from 'antd/es/upload';
import type { AriaAttributes, DOMAttributes } from 'react';
import * as React from 'react';

declare module 'react' {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        // extends React's HTMLAttributes
        css?: any;
    }
}

// 为antd/lib/upload添加声明
declare module 'antd/lib/upload' {
    import { UploadProps } from 'antd';
    const Upload: React.FC<UploadProps>;
    export default Upload;
    export interface RcFile extends File {
        uid: string;
        lastModified: number;
        lastModifiedDate: Date;
    }
}
