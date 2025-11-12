import React from 'react';
import { DeviceManagerDemo } from '../components/DeviceManagerDemo';
import MainLayout from '../layout/MainLayout';

const DeviceManagerPage: React.FC = () => {
    return (
        <MainLayout>
            <DeviceManagerDemo />
        </MainLayout>
    );
};

export default DeviceManagerPage;
