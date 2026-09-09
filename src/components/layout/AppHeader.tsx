import { Package } from 'lucide-react';

const AppHeader = () => {
  return (
    <header className="bg-primary text-primary-foreground py-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Package className="h-8 w-8 mr-3" />
          <h1 className="text-2xl font-headline font-semibold">유통기한 이슈 재고리스트</h1>
        </div>
        <div id="header-buttons-portal-target" className="flex items-center gap-2"></div> {/* Portal target for header buttons */}
      </div>
    </header>
  );
};

export default AppHeader;
