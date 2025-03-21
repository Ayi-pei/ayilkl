// 为缺少类型定义的模块创建声明文件

declare module 'emoji-picker-react';
declare module 'react-qrcode-logo';
declare module 'date-fns' {
    export function format(date: Date | number, format: string): string;
    export function parseISO(dateString: string): Date;
    export function isValid(date: any): boolean;
}

declare module 'date-fns/locale' {
    export const zhCN: Locale;
    export const enUS: Locale;
}
declare module '@ant-design/icons';

// 为React添加类型声明
import * as React from 'react';

declare global {
    namespace React {
        type Key = string | number;
        type JSXElementConstructor<P> = (props: P) => ReactElement<any, any> | null;
    }
}

// 为antd添加声明
declare module 'antd' {
    import { ModalStaticFunctions } from 'antd/es/modal';
    const Modal: ModalStaticFunctions & {
        info: (config: ModalFuncProps) => void;
    };
    import * as React from 'react';

    // Form组件完整类型定义
    export interface FormProps<T> extends React.FormHTMLAttributes<HTMLFormElement> {
        layout?: 'horizontal' | 'vertical' | 'inline';
        colon?: boolean;
        labelAlign?: 'left' | 'right';
        wrapperCol?: any;
    }

    export interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
        label?: React.ReactNode;
        name?: string | number | (string | number)[];
        rules?: Array<Record<string, any>>;
        validateStatus?: 'success' | 'warning' | 'error' | 'validating';
        hasFeedback?: boolean;
        required?: boolean;
        labelCol?: any;
        children?: React.ReactNode;
    }

    export class Form extends React.Component<FormProps<any>> {
        static Item: React.ComponentType<FormItemProps>;
        static useForm: any;
    }

    // Upload组件增强类型
    export interface UploadProps extends React.HTMLAttributes<HTMLDivElement> {
        name?: string;
        fileList?: any[];
        listType?: 'text' | 'picture' | 'picture-card' | 'picture-circle';
        showUploadList?: boolean | {
            showPreviewIcon?: boolean;
            showRemoveIcon?: boolean;
            showDownloadIcon?: boolean;
        };
        beforeUpload?: (file: RcFile, FileList: RcFile[]) => boolean | Promise<void>;
        customRequest?: (options: any) => void;
        accept?: string;
        multiple?: boolean;
        disabled?: boolean;
        maxCount?: number;
    }

    export class Upload extends React.Component<UploadProps> { }

    // 补充其他组件类型
    export interface TabsProps {
        activeKey?: string;
        animated?: boolean | { inkBar: boolean; tabPane: boolean };
        renderTabBar?: (props: any, DefaultTabBar: React.ComponentType) => React.ReactElement;
    }

    export class Tabs extends React.Component<TabsProps> {
        static TabPane: React.ComponentType<any>;
    }

    export class Button extends React.Component<ButtonProps> { }
    export class Modal extends React.Component<ModalProps> { }

    // 导出常用组件类型
    export const Input: React.ComponentType<any> & {
        TextArea: React.ComponentType<any>;
        Password: React.ComponentType<any>;
    };
    export const Select: React.ComponentType<any> & {
        Option: React.ComponentType<any>;
    };
    export const DatePicker: React.ComponentType<any>;
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